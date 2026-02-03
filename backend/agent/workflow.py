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
    1. PLANNING: LLM generates search queries
    2. SEARCHING: Execute DuckDuckGo searches
    3. SEARCH_ANALYSIS: LLM analyzes results, decides if more searches needed
    4. (Optional ITERATION: More searches based on analysis)
    5. DEEP_ANALYSIS: LLM performs comprehensive analysis
    6. SYNTHESIS: LLM generates final structured report
    """
    
    def __init__(self, api_key: str, model: Optional[str] = None):
        """
        Initialize research workflow.
        
        Args:
            api_key: SiliconFlow API key
            model: Model name to use
        """
        self.api_key = api_key
        self.model = model
        self.llm = create_llm(api_key=api_key, model=model)
        
        # Load system prompt
        self.system_prompt = self._load_system_prompt()
        
        # Research state
        self.research_id = str(uuid.uuid4())
        self.tool_calls: List[ToolCall] = []
        self.tool_results: List[ToolResult] = []
        self.sources: List[Dict[str, Any]] = []
        self.all_search_results: List[Dict[str, Any]] = []
        self.max_iterations = 2  # Max 2 iterations to avoid too many searches
        
    def _load_system_prompt(self) -> str:
        """Load system prompt from file."""
        prompt_path = Path(__file__).parent.parent / "prompts" / "system_prompt.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        return """You are a deep research expert. Provide verified, multi-perspective analysis with citations."""
    
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
        return """You are a search analysis expert. Analyze search results and decide if more searches are needed."""
    
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
            # Generate initial search queries
            search_queries = await self._plan_research(query)
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
            
            # Stage 3: Search Analysis & Iteration
            iteration = 0
            while iteration < self.max_iterations:
                yield self._sse_event("status", {
                    "status": ResearchStatus.ANALYZING,
                    "stage": "搜索分析",
                    "progress": 35 + (iteration * 10),
                    "message": f"第{iteration + 1}轮: 分析搜索结果，判断是否需要补充搜索..."
                })
                
                # Analyze search results
                analysis_result = await self._analyze_search_results(query, self.all_search_results)
                
                # Send analysis summary to console
                yield self._sse_event("thinking", {
                    "content": f"搜索分析: {analysis_result.get('analysis_summary', '分析完成')[:200]}..."
                })
                
                # Check if more searches needed
                if analysis_result.get("need_more_search", False) and iteration < self.max_iterations - 1:
                    additional_queries = analysis_result.get("additional_queries", [])
                    if additional_queries:
                        yield self._sse_event("status", {
                            "status": ResearchStatus.SEARCHING,
                            "stage": "补充搜索",
                            "progress": 40 + (iteration * 10),
                            "message": f"需要补充搜索，执行 {len(additional_queries)} 个新查询..."
                        })
                        
                        async for event in self._execute_searches_gen(additional_queries, search_days, max_results, 
                                                                    40 + (iteration * 10), 45 + (iteration * 10)):
                            yield event
                        iteration += 1
                        continue
                
                break  # No more searches needed
            
            # Stage 4: Deep Analysis
            yield self._sse_event("status", {
                "status": ResearchStatus.ANALYZING,
                "stage": "深度分析",
                "progress": 55,
                "message": "正在对所有信息进行深度分析..."
            })
            
            deep_analysis = await self._perform_deep_analysis(query, self.all_search_results)
            
            yield self._sse_event("thinking", {
                "content": f"深度分析完成: {deep_analysis.get('executive_summary', '分析完成')[:200]}..."
            })
            
            # Stage 5: Scrape top sources for detailed content
            yield self._sse_event("status", {
                "status": ResearchStatus.ANALYZING,
                "stage": "内容抓取",
                "progress": 70,
                "message": "正在抓取关键来源的详细内容..."
            })
            
            unique_sources = self._deduplicate_sources(self.all_search_results)
            async for event in self._scrape_sources_gen(unique_sources[:5], 70, 80):
                yield event
            
            # Get scraped contents from sources
            scraped_contents = []
            for source in self.sources:
                # Find the full content for this source
                for result in self.all_search_results:
                    if result.get('link') == source.get('url'):
                        scraped_contents.append({
                            "source": result,
                            "content": {"content": result.get('snippet', ''), "title": result.get('title', '')}
                        })
                        break
            
            # Stage 6: Generate final report
            yield self._sse_event("status", {
                "status": ResearchStatus.SYNTHESIZING,
                "stage": "综合总结",
                "progress": 80,
                "message": "正在生成最终研究报告..."
            })
            
            report = await self._generate_report(query, scraped_contents, deep_analysis)
            
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
                "iterations": iteration + 1,
                "total_searches": len(self.all_search_results)
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
    
    async def _plan_research(self, query: str) -> List[str]:
        """Plan research strategy by generating search queries."""
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
            
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            search_queries = json.loads(content.strip())
            
            if isinstance(search_queries, list):
                if query not in search_queries:
                    search_queries.insert(0, query)
                return search_queries[:5]
            
        except Exception as e:
            print(f"Planning error: {e}, falling back to original query")
        
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
        
        for idx, search_query in enumerate(queries):
            progress = progress_start + int((idx / total) * (progress_end - progress_start))
            
            yield self._sse_event("tool_call", {
                "tool": "search_web",
                "query": search_query,
                "progress": progress
            })
            
            try:
                result = await search_web(
                    query=search_query,
                    days=search_days,
                    max_results=max_results
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
        search_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze search results and decide if more searches are needed."""
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
        
        analysis_prompt = f"""{analysis_prompt_template}

原始查询："{query}"

搜索结果：
{context}

请分析以上搜索结果，按要求的JSON格式输出分析结果。"""

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
            # Return default result indicating no more searches needed
            return {
                "analysis_summary": "分析过程中出现错误，使用当前搜索结果继续",
                "need_more_search": False,
                "additional_queries": [],
                "reasoning": f"分析错误: {str(e)}"
            }
    
    async def _perform_deep_analysis(
        self, 
        query: str, 
        search_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Perform comprehensive deep analysis of all information."""
        deep_analysis_prompt_template = self._load_deep_analysis_prompt()
        
        # Build comprehensive context
        context_parts = []
        for idx, result in enumerate(search_results[:20], 1):  # Analyze top 20 results
            context_parts.append(
                f"【来源 {idx}】{result.get('title', '')}\n"
                f"来源网站: {result.get('source', 'Unknown')}\n"
                f"URL: {result.get('link', '')}\n"
                f"发布日期: {result.get('date', 'Unknown')}\n"
                f"内容摘要: {result.get('snippet', '')}\n"
            )
        
        context = "\n\n".join(context_parts)
        
        deep_analysis_prompt = f"""{deep_analysis_prompt_template}

研究主题："{query}"

已收集的所有信息：
{context}

请基于以上信息，进行全面的深度分析，按要求的JSON格式输出分析结果。"""

        try:
            messages = [
                SystemMessage(content="你是资深的行业研究分析师，擅长发现隐藏的模式、趋势和洞察。"),
                HumanMessage(content=deep_analysis_prompt)
            ]
            
            response = await self.llm.ainvoke(messages, max_tokens=6000)
            content = response.content
            
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            deep_analysis = json.loads(content.strip())
            return deep_analysis
            
        except Exception as e:
            print(f"Deep analysis error: {e}")
            # Return minimal result
            return {
                "executive_summary": "深度分析过程中出现错误",
                "key_themes": [],
                "key_insights": []
            }
    
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
    
    async def _generate_report(
        self,
        query: str,
        scraped_contents: List[Dict[str, Any]],
        deep_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate structured research report."""
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
        analysis_context = f"""
深度分析洞察：
- 执行摘要: {deep_analysis.get('executive_summary', '')}
- 关键主题: {', '.join([t.get('theme', '') for t in deep_analysis.get('key_themes', [])])}
- 核心洞察: {', '.join([i.get('insight', '') for i in deep_analysis.get('key_insights', [])])}
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

        messages = [
            SystemMessage(content="你是专业的深度研究报告撰写专家，擅长基于多源信息和深度分析生成高质量、结构化的研究报告。"),
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
            
            if line.startswith('## 📌 核心摘要'):
                current_section = "summary"
            elif line.startswith('## 🔍 研究路径'):
                current_section = "research_path"
            elif line.startswith('## 💡 关键发现'):
                current_section = "key_findings"
            elif line.startswith('## ⚖️ 多维分析'):
                current_section = "multi_dimensional_analysis"
            elif line.startswith('## ❓ 未解问题'):
                current_section = "open_questions"
            elif line.startswith('## 📚 参考文献'):
                current_section = "references"
            elif line.startswith('## '):
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
