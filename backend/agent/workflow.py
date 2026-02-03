# agent/workflow.py
"""
Research Agent Workflow - Multi-stage iterative research orchestration.
Implements ReAct-style workflow: Planning -> Search -> Analysis -> (Iteration) -> Deep Analysis -> Synthesis
"""

import os
import json
import uuid
import time
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate

from .llm import create_llm
from tools import search_web, scrape_url, analyze_pdf
from tools.search import format_search_results_for_llm
from tools.scrape import format_scraped_content_for_llm
from tools.pdf import format_pdf_content_for_llm
from models.schemas import ResearchStatus, ToolCall, ToolResult, SSEEvent
from utils.datetime_utils import inject_time_to_system_prompt, format_time_for_search_query


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle datetime objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class ResearchWorkflow:
    """
    Multi-stage iterative research workflow orchestrator.
    
    Workflow stages:
    1. PLANNING: LLM generates initial search queries
    2. SEARCHING: Execute web searches
    3. SEARCH_ANALYSIS: LLM analyzes results, extracts facts, identifies gaps
    4. ITERATION_DECISION: LLM decides if more searches needed
    5. (Optional ITERATION: More searches based on decision)
    6. DEEP_ANALYSIS: LLM performs comprehensive multi-dimensional analysis
    7. SYNTHESIS: LLM generates final structured report
    """
    
    def __init__(self, api_key: str, model: Optional[str] = None, search_engine: str = "bing", enable_thinking: bool = False):
        """
        Initialize research workflow.
        
        Args:
            api_key: SiliconFlow API key
            model: Model name to use
            search_engine: Search engine to use (bing/baidu/duckduckgo/serpapi)
            enable_thinking: Whether to enable thinking/reasoning mode for supported models
        """
        self.api_key = api_key
        self.model = model
        self.search_engine = search_engine
        self.enable_thinking = enable_thinking
        self.llm = create_llm(api_key=api_key, model=model, enable_thinking=enable_thinking)
        self.streaming_llm = create_llm(api_key=api_key, model=model, streaming=True, enable_thinking=enable_thinking)
        
        # Load system prompt
        self.system_prompt = self._load_system_prompt()
        
        # Research state
        self.research_id = str(uuid.uuid4())
        self.tool_calls: List[ToolCall] = []
        self.tool_results: List[ToolResult] = []
        self.sources: List[Dict[str, Any]] = []
        self.all_search_results: List[Dict[str, Any]] = []
        self.search_analyses: List[Dict[str, Any]] = []
        self.extracted_facts: List[Dict[str, Any]] = []
        self.max_iterations = 3  # Max 3 iterations to balance quality and speed
        
    def _load_system_prompt(self) -> str:
        """Load system prompt from file and inject current time context."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "system_prompt.txt"
        if prompt_path.exists():
            base_prompt = prompt_path.read_text(encoding="utf-8")
        else:
            base_prompt = """You are a deep research expert. Provide verified, multi-perspective analysis with citations."""
        
        # Inject real-time context into system prompt
        return inject_time_to_system_prompt(base_prompt)
    
    def _load_planning_prompt(self) -> str:
        """Load planning prompt from file."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "planning_prompt.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return """You are a research planning expert. Generate 3-5 search queries."""
    
    def _load_search_analysis_prompt(self) -> str:
        """Load search analysis prompt from file."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "search_analysis_prompt.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return """You are a search analysis expert. Analyze search results and extract key information."""
    
    def _load_iteration_decision_prompt(self) -> str:
        """Load iteration decision prompt from file."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "iteration_decision_prompt.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return """You are a research strategist. Decide if more searches are needed."""
    
    def _load_deep_analysis_prompt(self) -> str:
        """Load deep analysis prompt from file."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "deep_analysis_prompt.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return """You are a deep research analyst. Perform comprehensive analysis of all gathered information."""
    
    def _load_synthesis_prompt(self) -> str:
        """Load synthesis prompt from file."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "synthesis_prompt.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return """You are a research synthesis expert. Generate a comprehensive report."""
    
    async def execute(
        self,
        query: str,
        settings: Dict[str, Any],
        conversation_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Execute the multi-stage iterative research workflow.
        
        Args:
            query: User research query
            settings: Research settings (search_days, max_results, etc.)
            conversation_id: Optional conversation ID for context
            
        Yields:
            SSE-formatted event strings
        """
        start_time = time.time()
        
        # Stage 1: Planning
        yield self._sse_event("status", {
            "research_id": self.research_id,
            "status": ResearchStatus.PLANNING,
            "stage": "规划",
            "progress": 10,
            "message": "正在分析查询并制定研究计划..."
        })
        
        try:
            # Stage 1: Planning with streaming
            # Generate initial search queries with streaming output
            search_queries = []
            async for event in self._plan_research_streaming(query):
                yield event
                # Capture planning complete event to get queries
                if 'event: planning_complete' in event:
                    try:
                        lines = event.strip().split('\n')
                        for line in lines:
                            if line.startswith('data: '):
                                data = json.loads(line[6:])
                                search_queries = data.get('queries', [query])
                                break
                    except:
                        pass
            
            # Fallback if no queries extracted
            if not search_queries:
                search_queries = [query]
            
            yield self._sse_event("status", {
                "status": ResearchStatus.SEARCHING,
                "stage": "搜索",
                "progress": 20,
                "message": f"第1轮搜索: 执行 {len(search_queries)} 个查询..."
            })
            
            # Stage 2: Initial Search
            search_days = settings.get("search_days", 30)
            max_results = settings.get("max_results", 10)
            
            # Execute initial searches
            async for event in self._execute_searches_gen(search_queries, search_days, max_results, 20, 35):
                yield event
            
            # Stage 3-4: Search Analysis & Iteration Decision Loop
            iteration = 1
            while iteration <= self.max_iterations:
                # Analyze current search results
                yield self._sse_event("status", {
                    "status": ResearchStatus.ANALYZING,
                    "stage": "搜索分析",
                    "progress": 35 + (iteration * 5),
                    "message": f"第{iteration}轮: 分析搜索结果，提取关键信息..."
                })
                
                # Get current iteration's search results
                current_results = self._get_iteration_results(iteration)
                
                # Analyze search results
                analysis_result = await self._analyze_search_results(query, current_results, iteration)
                self.search_analyses.append(analysis_result)
                
                # Extract and accumulate facts
                new_facts = analysis_result.get("extracted_facts", [])
                self.extracted_facts.extend(new_facts)
                
                # Send analysis summary to console
                yield self._sse_event("thinking", {
                    "content": f"第{iteration}轮分析完成: 提取 {len(new_facts)} 个关键事实, "
                              f"识别 {len(analysis_result.get('information_gaps', []))} 个信息缺口"
                })
                
                # Stage 4: Iteration Decision
                if iteration < self.max_iterations:
                    yield self._sse_event("status", {
                        "status": ResearchStatus.ANALYZING,
                        "stage": "迭代决策",
                        "progress": 40 + (iteration * 5),
                        "message": f"评估是否需要第{iteration + 1}轮搜索..."
                    })
                    
                    decision = await self._make_iteration_decision(query, iteration)
                    
                    yield self._sse_event("thinking", {
                        "content": f"迭代决策: {'继续搜索' if decision.get('should_continue') else '停止搜索'} - "
                                  f"{decision.get('reasoning', '')[:150]}..."
                    })
                    
                    if decision.get("should_continue", False):
                        additional_queries = decision.get("next_search_plan", {}).get("search_queries", [])
                        if additional_queries:
                            query_strings = [q.get("query", "") for q in additional_queries[:3]]
                            yield self._sse_event("status", {
                                "status": ResearchStatus.SEARCHING,
                                "stage": f"第{iteration + 1}轮搜索",
                                "progress": 45 + (iteration * 5),
                                "message": f"执行 {len(query_strings)} 个补充查询..."
                            })
                            
                            async for event in self._execute_searches_gen(
                                query_strings, search_days, max_results, 
                                45 + (iteration * 5), 50 + (iteration * 5)
                            ):
                                yield event
                            
                            iteration += 1
                            continue
                
                break  # No more searches needed or max iterations reached
            
            # Stage 5: Deep Analysis with streaming
            yield self._sse_event("status", {
                "status": ResearchStatus.ANALYZING,
                "stage": "深度分析",
                "progress": 60,
                "message": "正在对所有信息进行深度分析..."
            })
            
            # Stream deep analysis
            deep_analysis_content = ""
            async for event in self._perform_deep_analysis_streaming(query):
                yield event
                if 'event: content_complete' in event:
                    try:
                        lines = event.strip().split('\n')
                        for line in lines:
                            if line.startswith('data: '):
                                data = json.loads(line[6:])
                                deep_analysis_content = data.get('content', '')
                                break
                    except:
                        pass
            
            # Parse deep analysis result
            deep_analysis = self._parse_deep_analysis(deep_analysis_content)
            
            yield self._sse_event("thinking", {
                "content": f"深度分析完成: {len(deep_analysis.get('key_findings', {}).get('core_insights', []))} 个核心洞察, "
                          f"{len(deep_analysis.get('theme_decomposition', {}).get('core_themes', []))} 个子主题"
            })
            
            # Stage 6: Scrape top sources for detailed content
            yield self._sse_event("status", {
                "status": ResearchStatus.ANALYZING,
                "stage": "内容抓取",
                "progress": 75,
                "message": "正在抓取关键来源的详细内容..."
            })
            
            unique_sources = self._deduplicate_sources(self.all_search_results)
            async for event in self._scrape_sources_gen(unique_sources[:5], 75, 85):
                yield event
            
            # Get scraped contents from sources
            scraped_contents = []
            for source in self.sources:
                for result in self.all_search_results:
                    if result.get('link') == source.get('url'):
                        scraped_contents.append({
                            "source": result,
                            "content": {"content": result.get('snippet', ''), "title": result.get('title', '')}
                        })
                        break
            
            # Stage 7: Generate final report with streaming
            yield self._sse_event("status", {
                "status": ResearchStatus.SYNTHESIZING,
                "stage": "综合总结",
                "progress": 85,
                "message": "正在生成最终研究报告..."
            })
            
            # Stream report generation
            report_content = ""
            async for event in self._generate_report_streaming(query, scraped_contents, deep_analysis):
                yield event
                if 'event: content_complete' in event:
                    try:
                        lines = event.strip().split('\n')
                        for line in lines:
                            if line.startswith('data: '):
                                data = json.loads(line[6:])
                                report_content = data.get('content', '')
                                break
                    except:
                        pass
            
            # Parse report
            report = self._parse_report(report_content)
            report["raw_content"] = report_content
            
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            yield self._sse_event("status", {
                "status": ResearchStatus.COMPLETED,
                "stage": "完成",
                "progress": 100,
                "message": "研究完成！"
            })
            
            # Send final report
            yield self._sse_event("complete", {
                "research_id": self.research_id,
                "query": query,
                "report": report,
                "sources": self.sources,
                "tool_calls": [call.dict() for call in self.tool_calls],
                "tool_results": [result.dict() for result in self.tool_results],
                "duration_ms": duration_ms,
                "iterations": iteration,
                "total_searches": len(self.all_search_results),
                "total_facts": len(self.extracted_facts)
            })
            
        except asyncio.TimeoutError:
            yield self._sse_event("error", {
                "status": ResearchStatus.TIMEOUT,
                "message": "研究超时，请稍后重试或简化查询"
            })
        except Exception as e:
            yield self._sse_event("error", {
                "status": ResearchStatus.ERROR,
                "message": f"研究过程中出现错误: {str(e)}"
            })
    
    def _get_iteration_results(self, iteration: int) -> List[Dict[str, Any]]:
        """Get search results for a specific iteration."""
        # For simplicity, we'll track which results came from which iteration
        # In a more complex implementation, we'd tag results with iteration number
        if iteration == 1:
            return self.all_search_results
        return self.all_search_results
    
    async def _plan_research_streaming(
        self, 
        query: str
    ) -> AsyncGenerator[str, None]:
        """
        Plan research strategy with streaming output.
        Yields SSE events and returns search queries.
        """
        planning_prompt_template = self._load_planning_prompt()
        
        # Get current time for search context
        current_time = format_time_for_search_query()
        
        planning_prompt = f"""{planning_prompt_template}

用户查询："{query}"

当前时间：{current_time}

请基于以上角色设定和示例，为该查询生成搜索子查询。为了获取最新的信息，建议在搜索查询中包含当前年份或时间相关关键词。
必须返回 JSON 数组格式。"""

        # Inject time context to system message
        system_content = inject_time_to_system_prompt("你是研究规划专家，擅长将复杂查询分解为高效的搜索策略。")
        
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=planning_prompt)
        ]
        
        # Stream the planning response
        accumulated_content = ""
        async for event in self._stream_llm_response(
            messages, 
            stage="planning",
            title="🔍 正在制定研究计划...",
            max_tokens=2000
        ):
            yield event
            # Extract accumulated content from complete event
            if '"event: content_complete"' in event or 'event: content_complete' in event:
                try:
                    # Parse the event to get content
                    lines = event.strip().split('\n')
                    for line in lines:
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
                            accumulated_content = data.get('content', '')
                            break
                except:
                    pass
        
        # Parse search queries from accumulated content
        search_queries = self._extract_search_queries(accumulated_content, query)
        
        # Yield planning complete event with queries
        yield self._sse_event("planning_complete", {
            "queries": search_queries,
            "strategy": accumulated_content[:500] if len(accumulated_content) > 500 else accumulated_content
        })
    
    def _extract_search_queries(self, content: str, fallback_query: str) -> List[str]:
        """Extract search queries from LLM response."""
        # Handle empty or None content
        if not content or not content.strip():
            print("Planning warning: Empty content received, using fallback query")
            return [fallback_query]
        
        try:
            # Extract JSON from response
            json_content = content
            if "```json" in content:
                json_content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                json_content = content.split("```")[1].split("```")[0]
            
            json_content = json_content.strip()
            
            if not json_content:
                print("Planning warning: Empty content after extraction, using fallback query")
                return [fallback_query]
            
            search_queries = json.loads(json_content)
            
            if isinstance(search_queries, list):
                # Filter out empty strings
                search_queries = [q for q in search_queries if q and str(q).strip()]
                if fallback_query not in search_queries:
                    search_queries.insert(0, fallback_query)
                return search_queries[:5]
            
        except json.JSONDecodeError as e:
            print(f"Planning JSON decode error: {e}, content: {content[:200]}...")
        except Exception as e:
            print(f"Planning error: {type(e).__name__}: {e}")
        
        return [fallback_query]
    
    async def _plan_research(self, query: str) -> List[str]:
        """Plan research strategy by generating search queries (non-streaming fallback)."""
        planning_prompt_template = self._load_planning_prompt()
        
        planning_prompt = f"""{planning_prompt_template}

用户查询："{query}"

请基于以上角色设定和示例，为该查询生成搜索子查询。必须返回 JSON 数组格式。"""

        try:
            messages = [
                SystemMessage(content="你是研究规划专家，擅长将复杂查询分解为高效的搜索策略。"),
                HumanMessage(content=planning_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            content = response.content
            
            # Debug: print raw response
            print(f"Planning response raw content: {content[:500]}...")
            
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            content = content.strip()
            print(f"Planning extracted content: {content[:500]}...")
            
            # Handle empty content
            if not content:
                print("Planning error: Empty content after extraction")
                return [query]
            
            search_queries = json.loads(content)
            
            if isinstance(search_queries, list):
                if query not in search_queries:
                    search_queries.insert(0, query)
                return search_queries[:5]
            else:
                print(f"Planning error: Expected list, got {type(search_queries)}")
            
        except json.JSONDecodeError as e:
            print(f"Planning JSON decode error: {e}, content: {content[:200] if 'content' in locals() else 'N/A'}...")
        except Exception as e:
            print(f"Planning error: {type(e).__name__}: {e}, falling back to original query")
        
        return [query]
    
    async def _execute_searches_gen(
        self, 
        queries: List[str], 
        search_days: int, 
        max_results: int,
        progress_start: int,
        progress_end: int
    ) -> AsyncGenerator[str, None]:
        """Execute search queries and collect results - Generator version."""
        failed_queries = []
        total = len(queries)
        
        # Import SearchEngine enum
        from tools.search import SearchEngine
        
        for idx, search_query in enumerate(queries):
            progress = progress_start + int((idx / total) * (progress_end - progress_start))
            
            yield self._sse_event("tool_call", {
                "tool": "search_web",
                "query": search_query,
                "progress": progress,
                "engine": self.search_engine
            })
            
            try:
                result = await search_web(
                    query=search_query,
                    days=search_days,
                    max_results=max_results,
                    engine=SearchEngine(self.search_engine)
                )
                
                self._log_tool_call("search_web", {"query": search_query})
                self._log_tool_result("search_web", result)
                
                if result["success"] and result["results"]:
                    self.all_search_results.extend(result["results"])
                    yield self._sse_event("tool_result", {
                        "tool": "search_web",
                        "success": True,
                        "result_count": len(result["results"]),
                        "data": result["results"][:5]
                    })
                else:
                    error_msg = result.get("error", "未知错误")
                    failed_queries.append({"query": search_query, "error": error_msg})
                    yield self._sse_event("tool_result", {
                        "tool": "search_web",
                        "success": False,
                        "error": error_msg
                    })
            except Exception as e:
                error_msg = str(e)
                failed_queries.append({"query": search_query, "error": error_msg})
                yield self._sse_event("tool_result", {
                    "tool": "search_web",
                    "success": False,
                    "error": error_msg
                })
        
        if failed_queries:
            print(f"⚠️ {len(failed_queries)}/{len(queries)} 个搜索查询失败")
        print(f"✅ 成功获取 {len(self.all_search_results)} 条搜索结果")
    
    async def _analyze_search_results(
        self, 
        query: str, 
        search_results: List[Dict[str, Any]],
        iteration: int
    ) -> Dict[str, Any]:
        """Analyze search results and extract key information."""
        analysis_prompt_template = self._load_search_analysis_prompt()
        
        # Build context from search results
        context_parts = []
        for idx, result in enumerate(search_results[:15], 1):  # Analyze top 15 results
            context_parts.append(
                f"【结果 {idx}】{result.get('title', '')}\n"
                f"来源: {result.get('source', 'Unknown')}\n"
                f"URL: {result.get('link', '')}\n"
                f"日期: {result.get('date', 'Unknown')}\n"
                f"摘要: {result.get('snippet', '')}\n"
            )
        
        context = "\n".join(context_parts)
        
        # Build previous analysis context
        previous_analysis = ""
        if self.search_analyses:
            prev = self.search_analyses[-1]
            previous_analysis = f"""上一轮分析结果：
- 提取事实数: {len(prev.get('extracted_facts', []))}
- 信息缺口: {', '.join(prev.get('information_gaps', [])[:3])}
- 建议搜索: {', '.join(prev.get('suggested_searches', [])[:3])}"""
        
        # Use replace instead of format to avoid issues with JSON braces in template
        analysis_prompt = analysis_prompt_template.replace(
            "{query}", query
        ).replace(
            "{current_search}", f"第{iteration}轮搜索"
        ).replace(
            "{search_results}", context
        ).replace(
            "{previous_analysis}", previous_analysis
        )

        try:
            messages = [
                SystemMessage(content="你是专业的搜索分析专家，擅长评估搜索结果质量并识别信息缺口。"),
                HumanMessage(content=analysis_prompt)
            ]
            
            response = await self.llm.ainvoke(messages, max_tokens=4000)
            content = response.content
            
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            analysis_result = json.loads(content.strip())
            return analysis_result
            
        except Exception as e:
            print(f"Search analysis error: {e}")
            # Return default result
            return {
                "extracted_facts": [],
                "key_entities": [],
                "information_gaps": ["分析过程中出现错误"],
                "suggested_searches": [],
                "needs_more_search": False,
                "reasoning": f"分析错误: {str(e)}"
            }
    
    async def _make_iteration_decision(self, query: str, current_iteration: int) -> Dict[str, Any]:
        """Decide whether to continue with more searches."""
        decision_prompt_template = self._load_iteration_decision_prompt()
        
        # Build context
        completed_searches = []
        for idx, result in enumerate(self.all_search_results, 1):
            completed_searches.append(f"{idx}. {result.get('title', '')} ({result.get('source', '')})")
        
        # Get latest analysis
        latest_analysis = self.search_analyses[-1] if self.search_analyses else {}
        
        # Use replace instead of format to avoid issues with JSON braces in template
        decision_prompt = decision_prompt_template.replace(
            "{query}", query
        ).replace(
            "{current_iteration}", str(current_iteration)
        ).replace(
            "{max_iterations}", str(self.max_iterations)
        ).replace(
            "{completed_searches}", "\n".join(completed_searches[:20])
        ).replace(
            "{collected_facts}", json.dumps(self.extracted_facts[:10], ensure_ascii=False)
        ).replace(
            "{information_gaps}", json.dumps(latest_analysis.get("information_gaps", []), ensure_ascii=False)
        ).replace(
            "{previous_suggestions}", json.dumps(latest_analysis.get("suggested_searches", []), ensure_ascii=False)
        )

        try:
            messages = [
                SystemMessage(content="你是智能研究策略师，擅长评估研究状态并制定最优搜索策略。"),
                HumanMessage(content=decision_prompt)
            ]
            
            response = await self.llm.ainvoke(messages, max_tokens=3000)
            content = response.content
            
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            decision_result = json.loads(content.strip())
            return decision_result
            
        except Exception as e:
            print(f"Iteration decision error: {e}")
            # Default to stopping if decision fails
            return {
                "decision": {
                    "should_continue": False,
                    "confidence": 0.5,
                    "reasoning": f"决策过程出错，使用当前结果继续: {str(e)}"
                },
                "current_status": {
                    "information_coverage": "medium",
                    "information_quality": "medium"
                },
                "next_search_plan": {}
            }
    
    async def _perform_deep_analysis_streaming(
        self, 
        query: str
    ) -> AsyncGenerator[str, None]:
        """Perform comprehensive deep analysis with streaming output."""
        deep_analysis_prompt_template = self._load_deep_analysis_prompt()
        
        # Build comprehensive context from all sources
        context_parts = []
        for idx, result in enumerate(self.all_search_results[:20], 1):
            context_parts.append(
                f"【来源 {idx}】{result.get('title', '')}\n"
                f"来源网站: {result.get('source', 'Unknown')}\n"
                f"URL: {result.get('link', '')}\n"
                f"发布日期: {result.get('date', 'Unknown')}\n"
                f"内容摘要: {result.get('snippet', '')}\n"
            )
        
        all_sources = "\n\n".join(context_parts)
        
        # Build search analyses summary
        search_analyses_summary = []
        for idx, analysis in enumerate(self.search_analyses, 1):
            search_analyses_summary.append(
                f"第{idx}轮分析:\n"
                f"- 提取事实: {len(analysis.get('extracted_facts', []))}\n"
                f"- 关键实体: {', '.join([e.get('name', '') for e in analysis.get('key_entities', [])[:5]])}\n"
                f"- 信息缺口: {', '.join(analysis.get('information_gaps', [])[:3])}"
            )
        
        # Use replace instead of format to avoid issues with JSON braces in template
        deep_analysis_prompt = deep_analysis_prompt_template.replace(
            "{query}", query
        ).replace(
            "{all_sources}", all_sources
        ).replace(
            "{search_analyses}", "\n\n".join(search_analyses_summary)
        )

        # Inject time context to system message
        system_content = inject_time_to_system_prompt("你是资深的行业研究分析师，擅长发现隐藏的模式、趋势和洞察。")
        
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=deep_analysis_prompt)
        ]
        
        # Stream the analysis
        async for event in self._stream_llm_response(
            messages,
            stage="deep_analysis",
            title="📊 深度分析中...",
            max_tokens=6000
        ):
            yield event
    
    def _parse_deep_analysis(self, content: str) -> Dict[str, Any]:
        """Parse deep analysis result from content."""
        try:
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            deep_analysis = json.loads(content.strip())
            return deep_analysis
            
        except Exception as e:
            print(f"Deep analysis parse error: {e}")
            # Return minimal result
            return {
                "theme_decomposition": {"core_themes": [], "relationships": ""},
                "multi_perspective_analysis": {},
                "causal_analysis": {"drivers": [], "causal_chains": []},
                "comparative_analysis": {"comparisons": []},
                "key_findings": {
                    "core_insights": [],
                    "important_trends": [],
                    "counter_intuitive_findings": []
                },
                "confidence_assessment": {
                    "overall_confidence": "low",
                    "uncertainties": [f"分析过程出错: {str(e)}"]
                }
            }
    
    async def _perform_deep_analysis(self, query: str) -> Dict[str, Any]:
        """Perform comprehensive deep analysis of all information (non-streaming)."""
        deep_analysis_prompt_template = self._load_deep_analysis_prompt()
        
        # Build comprehensive context from all sources
        context_parts = []
        for idx, result in enumerate(self.all_search_results[:20], 1):
            context_parts.append(
                f"【来源 {idx}】{result.get('title', '')}\n"
                f"来源网站: {result.get('source', 'Unknown')}\n"
                f"URL: {result.get('link', '')}\n"
                f"发布日期: {result.get('date', 'Unknown')}\n"
                f"内容摘要: {result.get('snippet', '')}\n"
            )
        
        all_sources = "\n\n".join(context_parts)
        
        # Build search analyses summary
        search_analyses_summary = []
        for idx, analysis in enumerate(self.search_analyses, 1):
            search_analyses_summary.append(
                f"第{idx}轮分析:\n"
                f"- 提取事实: {len(analysis.get('extracted_facts', []))}\n"
                f"- 关键实体: {', '.join([e.get('name', '') for e in analysis.get('key_entities', [])[:5]])}\n"
                f"- 信息缺口: {', '.join(analysis.get('information_gaps', [])[:3])}"
            )
        
        # Use replace instead of format to avoid issues with JSON braces in template
        deep_analysis_prompt = deep_analysis_prompt_template.replace(
            "{query}", query
        ).replace(
            "{all_sources}", all_sources
        ).replace(
            "{search_analyses}", "\n\n".join(search_analyses_summary)
        )

        try:
            # Inject time context to system message
            system_content = inject_time_to_system_prompt("你是资深的行业研究分析师，擅长发现隐藏的模式、趋势和洞察。")
            
            messages = [
                SystemMessage(content=system_content),
                HumanMessage(content=deep_analysis_prompt)
            ]
            
            response = await self.llm.ainvoke(messages, max_tokens=6000)
            content = response.content
            
            return self._parse_deep_analysis(content)
            
        except Exception as e:
            print(f"Deep analysis error: {e}")
            return self._parse_deep_analysis("")
    
    async def _scrape_sources_gen(
        self, 
        sources: List[Dict[str, Any]], 
        progress_start: int, 
        progress_end: int
    ) -> AsyncGenerator[str, None]:
        """Scrape top sources for detailed content - Generator version."""
        total = len(sources)
        
        for idx, source in enumerate(sources):
            url = source.get("link", "")
            if not url:
                continue
            
            progress = progress_start + int((idx / total) * (progress_end - progress_start))
            
            yield self._sse_event("tool_call", {
                "tool": "scrape_url",
                "url": url,
                "progress": progress
            })
            
            scrape_result = await scrape_url(url)
            
            self._log_tool_call("scrape_url", {"url": url})
            self._log_tool_result("scrape_url", scrape_result)
            
            if scrape_result["success"]:
                self.sources.append({
                    "index": len(self.sources) + 1,
                    "title": scrape_result.get("title", source.get("title", "")),
                    "source_name": source.get("source", ""),
                    "date": source.get("date", ""),
                    "url": url
                })
                
                yield self._sse_event("tool_result", {
                    "tool": "scrape_url",
                    "success": True,
                    "title": scrape_result.get("title", ""),
                    "data": {
                        "title": scrape_result.get("title", ""),
                        "url": url,
                        "content_length": len(scrape_result.get("content", "")),
                        "content_preview": scrape_result.get("content", "")[:500] + "..." if len(scrape_result.get("content", "")) > 500 else scrape_result.get("content", "")
                    }
                })
            else:
                yield self._sse_event("tool_result", {
                    "tool": "scrape_url",
                    "success": False,
                    "error": scrape_result.get("error")
                })
    
    async def _generate_report_streaming(
        self,
        query: str,
        scraped_contents: List[Dict[str, Any]],
        deep_analysis: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        """Generate structured research report with streaming output."""
        synthesis_prompt_template = self._load_synthesis_prompt()
        
        # Build context from scraped content
        context_parts = []
        for idx, item in enumerate(scraped_contents, 1):
            source = item["source"]
            content = item["content"]
            
            context_parts.append(
                f"【来源 {idx}】{source.get('title', '')}\n"
                f"URL: {source.get('link', '')}\n"
                f"来源网站: {source.get('source', 'Unknown')}\n"
                f"发布日期: {source.get('date', 'Unknown')}\n"
                f"内容:\n{content.get('content', '')[:8000]}\n"
            )
        
        context = "\n\n" + "="*50 + "\n\n".join(context_parts)
        
        # Include deep analysis insights
        key_findings = deep_analysis.get("key_findings", {})
        analysis_context = f"""
深度分析洞察：
- 核心主题: {', '.join([t.get('theme', '') for t in deep_analysis.get('theme_decomposition', {}).get('core_themes', [])])}
- 核心洞察: {', '.join([i.get('insight', '') for i in key_findings.get('core_insights', [])])}
- 重要趋势: {', '.join([t.get('trend', '') for t in key_findings.get('important_trends', [])])}
- 整体置信度: {deep_analysis.get('confidence_assessment', {}).get('overall_confidence', 'medium')}
"""
        
        synthesis_prompt = f"""{synthesis_prompt_template}

用户研究查询："{query}"

{analysis_context}

已收集的详细来源资料：
{context}

请基于以上角色设定、深度分析洞察和收集的资料，生成一份详细的研究报告。报告必须：
1. 严格遵循上述结构要求
2. 每个重要论断都必须标注来源引用 [N]
3. 内容详实，每个部分都要有充分展开
4. 报告总字数不少于3000字
5. 融入深度分析阶段的核心洞察
6. 使用中文撰写"""

        # Inject time context to system message
        system_content = inject_time_to_system_prompt("你是专业的深度研究报告撰写专家，擅长基于多源信息和深度分析生成高质量、结构化的研究报告。")
        
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=synthesis_prompt)
        ]
        
        # Stream the report generation
        async for event in self._stream_llm_response(
            messages,
            stage="synthesis",
            title="📝 正在生成研究报告...",
            max_tokens=8000
        ):
            yield event
    
    async def _generate_report(
        self,
        query: str,
        scraped_contents: List[Dict[str, Any]],
        deep_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate structured research report (non-streaming)."""
        synthesis_prompt_template = self._load_synthesis_prompt()
        
        # Build context from scraped content
        context_parts = []
        for idx, item in enumerate(scraped_contents, 1):
            source = item["source"]
            content = item["content"]
            
            context_parts.append(
                f"【来源 {idx}】{source.get('title', '')}\n"
                f"URL: {source.get('link', '')}\n"
                f"来源网站: {source.get('source', 'Unknown')}\n"
                f"发布日期: {source.get('date', 'Unknown')}\n"
                f"内容:\n{content.get('content', '')[:8000]}\n"
            )
        
        context = "\n\n" + "="*50 + "\n\n".join(context_parts)
        
        # Include deep analysis insights
        key_findings = deep_analysis.get("key_findings", {})
        analysis_context = f"""
深度分析洞察：
- 核心主题: {', '.join([t.get('theme', '') for t in deep_analysis.get('theme_decomposition', {}).get('core_themes', [])])}
- 核心洞察: {', '.join([i.get('insight', '') for i in key_findings.get('core_insights', [])])}
- 重要趋势: {', '.join([t.get('trend', '') for t in key_findings.get('important_trends', [])])}
- 整体置信度: {deep_analysis.get('confidence_assessment', {}).get('overall_confidence', 'medium')}
"""
        
        synthesis_prompt = f"""{synthesis_prompt_template}

用户研究查询："{query}"

{analysis_context}

已收集的详细来源资料：
{context}

请基于以上角色设定、深度分析洞察和收集的资料，生成一份详细的研究报告。报告必须：
1. 严格遵循上述结构要求
2. 每个重要论断都必须标注来源引用 [N]
3. 内容详实，每个部分都要有充分展开
4. 报告总字数不少于3000字
5. 融入深度分析阶段的核心洞察
6. 使用中文撰写"""

        # Inject time context to system message
        system_content = inject_time_to_system_prompt("你是专业的深度研究报告撰写专家，擅长基于多源信息和深度分析生成高质量、结构化的研究报告。")
        
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=synthesis_prompt)
        ]
        
        response = await self.llm.ainvoke(
            messages,
            max_tokens=8000
        )
        content = response.content
        
        # Parse structured report
        report = self._parse_report(content)
        report["raw_content"] = content
        
        return report
    
    def _parse_report(self, content: str) -> Dict[str, Any]:
        """Parse markdown report into structured sections."""
        sections = {
            "summary": "",
            "research_path": [],
            "key_findings": [],
            "multi_dimensional_analysis": {},
            "open_questions": [],
            "references": []
        }
        
        current_section = None
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('## 📌 核心摘要') or line.startswith('## 📌 执行摘要'):
                current_section = "summary"
            elif line.startswith('## 🔍 研究路径') or line.startswith('## 🔍 研究方法与数据来源'):
                current_section = "research_path"
            elif line.startswith('## 💡 关键发现') or line.startswith('## 💡 核心发现'):
                current_section = "key_findings"
            elif line.startswith('## ⚖️ 多维分析') or line.startswith('## 📈 详细分析'):
                current_section = "multi_dimensional_analysis"
            elif line.startswith('## ❓ 未解问题') or line.startswith('## ❓ 未解问题与研究缺口'):
                current_section = "open_questions"
            elif line.startswith('## 📚 参考文献') or line.startswith('## 📚 参考来源'):
                current_section = "references"
            elif line.startswith('##'):
                current_section = None
            elif line and current_section:
                if current_section == "summary":
                    sections["summary"] += line + " "
                elif current_section == "research_path":
                    if line.startswith('- ') or line[0].isdigit():
                        sections["research_path"].append(line.lstrip('- ').lstrip('0123456789. '))
                elif current_section == "key_findings":
                    if line.startswith('- ') or line.startswith('• '):
                        sections["key_findings"].append(line.lstrip('- •'))
                elif current_section == "open_questions":
                    if line.startswith('- ') or line.startswith('• '):
                        sections["open_questions"].append(line.lstrip('- •'))
                elif current_section == "references":
                    if line.startswith('[') and ']' in line:
                        sections["references"].append(line)
        
        sections["summary"] = sections["summary"].strip()
        
        return sections
    
    def _deduplicate_sources(self, sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate sources based on URL."""
        seen_urls = set()
        unique = []
        
        for source in sources:
            url = source.get("link", "")
            normalized = url.replace("https://", "").replace("http://", "").rstrip("/")
            
            if normalized and normalized not in seen_urls:
                seen_urls.add(normalized)
                unique.append(source)
        
        return unique
    
    def _log_tool_call(self, tool_name: str, parameters: Dict[str, Any]):
        """Log a tool call."""
        self.tool_calls.append(ToolCall(
            tool_name=tool_name,
            parameters=parameters
        ))
    
    def _log_tool_result(self, tool_name: str, result: Dict[str, Any]):
        """Log a tool result."""
        self.tool_results.append(ToolResult(
            tool_name=tool_name,
            success=result.get("success", False),
            data=result if result.get("success") else None,
            error=result.get("error") if not result.get("success") else None,
            duration_ms=int(result.get("search_time", 0) * 1000)
        ))
    
    def _sse_event(self, event_type: str, data: Dict[str, Any]) -> str:
        """Format data as SSE event."""
        return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False, cls=DateTimeEncoder)}\n\n"
    
    async def _stream_llm_response(
        self,
        messages: list,
        stage: str,
        title: str,
        max_tokens: int = 4000
    ) -> AsyncGenerator[str, None]:
        """
        Stream LLM response and yield content chunks as SSE events.
        
        Args:
            messages: List of messages to send to LLM
            stage: Current stage identifier
            title: Title for this streaming content
            max_tokens: Maximum tokens to generate
            
        Yields:
            SSE-formatted event strings
        """
        content_id = f"{stage}_{int(time.time() * 1000)}"
        accumulated_content = ""
        
        # Send start event
        yield self._sse_event("content_start", {
            "id": content_id,
            "stage": stage,
            "title": title,
            "timestamp": datetime.now().isoformat()
        })
        
        try:
            # Stream the response
            async for chunk in self.streaming_llm.astream(messages, max_tokens=max_tokens):
                if chunk.content:
                    accumulated_content += chunk.content
                    # Send content chunk
                    yield self._sse_event("content_chunk", {
                        "id": content_id,
                        "stage": stage,
                        "chunk": chunk.content,
                        "accumulated": accumulated_content,
                        "timestamp": datetime.now().isoformat()
                    })
            
            # Send complete event
            yield self._sse_event("content_complete", {
                "id": content_id,
                "stage": stage,
                "title": title,
                "content": accumulated_content,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"Streaming error in {stage}: {e}")
            # Send error event
            yield self._sse_event("content_complete", {
                "id": content_id,
                "stage": stage,
                "title": title,
                "content": accumulated_content,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
