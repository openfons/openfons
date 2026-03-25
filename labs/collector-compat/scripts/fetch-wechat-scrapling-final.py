"""
使用 Scrapling 抓取微信公众号文章 - 最终版
测试链接: https://mp.weixin.qq.com/s/ljMffydOigAl1muyLFhQhw
"""

import sys
import json
import re
import os

def fetch_wechat_article(url):
    """使用 Scrapling 抓取微信文章"""
    try:
        from scrapling import Fetcher
        
        print("[INFO] 开始抓取: {}".format(url))
        
        # 创建 fetcher 实例
        fetcher = Fetcher()
        
        # 发送请求
        response = fetcher.get(url)
        
        print("[INFO] 响应类型: {}".format(type(response)))
        print("[INFO] 响应状态: {}".format(response.status if hasattr(response, 'status') else 'N/A'))
        
        # 提取信息
        result = {
            "url": url,
            "success": True,
            "status": response.status if hasattr(response, 'status') else None,
            "title": None,
            "content": None,
            "error": None
        }
        
        # 获取 HTML 内容
        html_content = None
        if hasattr(response, 'html_content'):
            html_content = response.html_content
            print("[OK] 通过 html_content 获取内容，长度: {}".format(len(html_content)))
        elif hasattr(response, 'text'):
            html_content = response.text
            print("[OK] 通过 text 获取内容，长度: {}".format(len(html_content)))
        
        if html_content and len(html_content) > 0:
            # 尝试从 HTML 中提取标题
            title_patterns = [
                r'<h1[^>]*class=["\']rich_media_title[^"\']*["\'][^>]*>(.*?)</h1>',
                r'<h2[^>]*class=["\']rich_media_title[^"\']*["\'][^>]*>(.*?)</h2>',
                r'<h1[^>]*>(.*?)</h1>',
                r'var msg_title = [\'"](.+?)[\'"];',
                r'<title>(.*?)</title>',
                r'"msg_title":"([^"]+)"'
            ]
            
            for pattern in title_patterns:
                title_match = re.search(pattern, html_content, re.DOTALL | re.IGNORECASE)
                if title_match:
                    result["title"] = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()
                    print("[OK] 标题提取成功: {}".format(result['title'][:80]))
                    break
            
            # 尝试提取正文
            content_patterns = [
                r'<div[^>]*id=["\']js_content["\'][^>]*>(.*?)</div>\s*</div>\s*<script',
                r'<div[^>]*id=["\']js_content["\'][^>]*>(.*?)</div>\s*<script',
                r'<div[^>]*id=["\']js_content["\'][^>]*>(.*?)</div>',
                r'<div[^>]*class=["\']rich_media_content["\'][^>]*>(.*?)</div>\s*</div>\s*<script',
                r'<div[^>]*class=["\']rich_media_content["\'][^>]*>(.*?)</div>\s*<script',
                r'<div[^>]*class=["\']rich_media_content["\'][^>]*>(.*?)</div>'
            ]
            
            for pattern in content_patterns:
                content_match = re.search(pattern, html_content, re.DOTALL | re.IGNORECASE)
                if content_match:
                    content_html = content_match.group(1)
                    # 去除 HTML 标签但保留段落
                    content_text = re.sub(r'</p>', '\n', content_html)
                    content_text = re.sub(r'</div>', '\n', content_text)
                    content_text = re.sub(r'<br[^>]*>', '\n', content_text)
                    content_text = re.sub(r'<[^>]+>', '', content_text)
                    content_text = re.sub(r'\n\s*\n', '\n\n', content_text)
                    content_text = content_text.strip()
                    result["content"] = content_text
                    print("[OK] 内容提取成功: {} 字符".format(len(result['content'])))
                    break
            
            if not result["content"]:
                print("[WARN] 未能提取到正文内容")
        else:
            print("[FAIL] HTML 内容为空")
            result["success"] = False
            result["error"] = "HTML 内容为空"
        
        return result
        
    except Exception as e:
        print("[FAIL] 抓取失败: {}".format(e))
        import traceback
        traceback.print_exc()
        return {
            "url": url,
            "success": False,
            "title": None,
            "content": None,
            "error": str(e)
        }

def main():
    url = "https://mp.weixin.qq.com/s/ljMffydOigAl1muyLFhQhw"
    
    print("=" * 60)
    print("Scrapling 微信公众号文章抓取测试")
    print("=" * 60)
    print()
    
    result = fetch_wechat_article(url)
    
    print()
    print("=" * 60)
    print("抓取结果汇总")
    print("=" * 60)
    print("URL: {}".format(result['url']))
    print("状态: {}".format('成功' if result['success'] else '失败'))
    print("HTTP 状态: {}".format(result.get('status', 'N/A')))
    
    if result.get('title'):
        print("\n标题: {}".format(result['title']))
    else:
        print("\n标题: 未提取到")
    
    if result.get('content'):
        print("\n内容长度: {} 字符".format(len(result['content'])))
        print("\n内容预览 (前500字符):")
        preview = result['content'][:500]
        print(preview)
        print("...")
    else:
        print("\n内容: 未提取到")
    
    if result.get('error'):
        print("\n错误: {}".format(result['error']))
    
    # 保存结果到文件
    output_dir = "results/artifacts/wechat_scrapling"
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存 JSON 结果
    json_file = os.path.join(output_dir, "wechat_article_result.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("\n[INFO] JSON 结果已保存到: {}".format(json_file))
    
    # 保存纯文本内容
    if result.get('content'):
        text_file = os.path.join(output_dir, "wechat_article_content.txt")
        with open(text_file, "w", encoding="utf-8") as f:
            f.write("标题: {}\n".format(result.get('title', 'N/A')))
            f.write("URL: {}\n".format(url))
            f.write("=" * 60 + "\n\n")
            f.write(result['content'])
        print("[INFO] 正文已保存到: {}".format(text_file))
    
    return 0 if result['success'] and result.get('content') else 1

if __name__ == "__main__":
    sys.exit(main())
