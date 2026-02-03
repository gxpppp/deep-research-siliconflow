import re
import json

with open('silconflow', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取模型ID模式 (Provider/Model-Name)
pattern = r'([a-zA-Z0-9_-]+/[a-zA-Z0-9_.-]+)'
matches = re.findall(pattern, content)
unique_models = sorted(list(set(matches)))

# 过滤掉非模型项
filtered_models = []
for m in unique_models:
    # 跳过明显不是模型的项
    if any(x in m.lower() for x in ['v3/r1', 'pro/01-ai']):
        continue
    if '/' in m and len(m.split('/')) == 2:
        provider, model = m.split('/')
        # 只保留合理的模型名称
        if len(provider) > 1 and len(model) > 1:
            filtered_models.append(m)

print(f"Found {len(filtered_models)} unique models:\n")
for m in filtered_models:
    print(f'"{m}",')
