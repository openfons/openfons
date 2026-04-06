"""
使用 Scrapling 抓取微信公众号文章 - 最终版（支持图片下载）
文章链接: https://mp.weixin.qq.com/s/Z1HHOGPpNkhRYTOFl5UpNA
"""

import sys
import json
import re
import os
import hashlib
import urllib.parse
import requests


def download_image(url, save_dir, headers=None):
    """下载图片到本地"""
    try:
        if headers is None:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
            }
        
        # 生成文件名
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        parsed = urllib.parse.urlparse(url)
        path = parsed.path
        ext = os.path.splitext(path)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
            ext = '.jpg'
        filename = f"image_{url_hash}{ext}"
        filepath = os.path.join(save_dir, filename)
        
        # 如果已存在则跳过
        if os.path.exists(filepath):
            return filename
        
        # 下载图片
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return filename
        return None
    except Exception as e:
        print("[WARN] 下载图片失败 {}: {}".format(url, e))
        return None


def fetch_wechat_article(url, output_dir):
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
            "content_html": None,
            "content_text": None,
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
            
            # 尝试提取正文 HTML
            content_patterns = [
                r'<div[^>]*id=["\']js_content["\'][^>]*>(.*?)</div>\s*</div>\s*<script',
                r'<div[^>]*id=["\']js_content["\'][^>]*>(.*?)</div>\s*<script',
                r'<div[^>]*id=["\']js_content["\'][^>]*>(.*?)</div>',
                r'<div[^>]*class=["\']rich_media_content["\'][^>]*>(.*?)</div>\s*</div>\s*<script',
                r'<div[^>]*class=["\']rich_media_content["\'][^>]*>(.*?)</div>\s*<script',
                r'<div[^>]*class=["\']rich_media_content["\'][^>]*>(.*?)</div>'
            ]
            
            content_html = None
            for pattern in content_patterns:
                content_match = re.search(pattern, html_content, re.DOTALL | re.IGNORECASE)
                if content_match:
                    content_html = content_match.group(1)
                    print("[OK] 正文 HTML 提取成功: {} 字符".format(len(content_html)))
                    break
            
            if content_html:
                # 创建图片保存目录
                images_dir = os.path.join(output_dir, "images")
                os.makedirs(images_dir, exist_ok=True)
                
                # 提取并下载图片
                img_pattern = r'<img[^>]+data-src=["\']([^"\']+)["\'][^>]*>'
                img_urls = re.findall(img_pattern, content_html)
                print("[INFO] 发现 {} 张图片".format(len(img_urls)))
                
                # 替换图片 URL 为本地路径
                img_mapping = {}
                for i, img_url in enumerate(img_urls, 1):
                    local_filename = download_image(img_url, images_dir)
                    if local_filename:
                        img_mapping[img_url] = "images/{}".format(local_filename)
                        print("[OK] 下载图片 {}/{}: {}".format(i, len(img_urls), local_filename))
                
                # 替换正文中的图片 URL - 先清理其他属性，再替换 src
                # 清理微信特有的属性（除了 data-src，因为我们要用它来找图片）
                content_html = re.sub(r'data-type=["\'][^"\']*["\']', '', content_html)
                content_html = re.sub(r'data-ratio=["\'][^"\']*["\']', '', content_html)
                content_html = re.sub(r'data-w=["\'][^"\']*["\']', '', content_html)
                
                # 替换图片 URL
                for original_url, local_path in img_mapping.items():
                    # 替换 data-src 为 src
                    content_html = content_html.replace('data-src="{}"'.format(original_url), 'src="{}"'.format(local_path))
                    content_html = content_html.replace("data-src='{}'".format(original_url), 'src="{}"'.format(local_path))
                
                # 清理剩余的 data-src 属性（未成功下载的图片）
                content_html = re.sub(r'\s*data-src=["\'][^"\']*["\']', '', content_html)
                
                result["content_html"] = content_html
                
                # 生成纯文本内容
                content_text = re.sub(r'</p>', '\n', content_html)
                content_text = re.sub(r'</div>', '\n', content_text)
                content_text = re.sub(r'<br[^>]*>', '\n', content_text)
                content_text = re.sub(r'<[^>]+>', '', content_text)
                content_text = re.sub(r'\n\s*\n', '\n\n', content_text)
                content_text = content_text.strip()
                result["content_text"] = content_text
                print("[OK] 内容提取成功: {} 字符".format(len(result['content_text'])))
            else:
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
            "content_html": None,
            "content_text": None,
            "error": str(e)
        }


def generate_html(article_data, output_file):
    """生成完整的 HTML 文件"""
    
    html_template = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.8;
            color: #333;
            background: #f5f5f5;
        }}
        .article-container {{
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        h1 {{
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            line-height: 1.4;
            color: #222;
        }}
        h2, h3, h4 {{
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 15px;
            color: #333;
        }}
        h2 {{ font-size: 20px; }}
        h3 {{ font-size: 18px; }}
        h4 {{ font-size: 16px; }}
        p {{
            margin-bottom: 15px;
            text-align: justify;
        }}
        img {{
            max-width: 100%;
            height: auto;
            display: block;
            margin: 20px auto;
            border-radius: 4px;
        }}
        pre {{
            background: #f8f8f8;
            padding: 15px;
            overflow-x: auto;
            border-radius: 4px;
            font-family: "Consolas", "Monaco", "Courier New", monospace;
            font-size: 14px;
            line-height: 1.5;
            border-left: 3px solid #ddd;
            margin: 15px 0;
        }}
        code {{
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Consolas", "Monaco", "Courier New", monospace;
            font-size: 14px;
        }}
        blockquote {{
            border-left: 4px solid #07c160;
            padding-left: 20px;
            margin: 15px 0;
            color: #666;
            font-style: italic;
        }}
        ul, ol {{
            margin-bottom: 15px;
            padding-left: 30px;
        }}
        li {{
            margin-bottom: 8px;
        }}
        strong {{
            font-weight: bold;
            color: #222;
        }}
        em {{
            font-style: italic;
        }}
        .meta {{
            color: #999;
            font-size: 14px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 14px;
        }}
        .footer a {{
            color: #07c160;
            text-decoration: none;
        }}
        section {{
            margin-bottom: 10px;
        }}
    </style>
</head>
<body>
    <div class="article-container">
        <h1>{title}</h1>
        <div class="meta">微信公众号文章</div>
        <div class="rich_media_content">
            {content}
        </div>
        <div class="footer">
            <p>原文链接: <a href="{url}" target="_blank">{url}</a></p>
            <p>采集时间: {fetch_time}</p>
        </div>
    </div>
</body>
</html>'''
    
    from datetime import datetime
    fetch_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    html = html_template.format(
        title=article_data.get('title', '无标题'),
        content=article_data.get('content_html', ''),
        url=article_data.get('url', ''),
        fetch_time=fetch_time
    )
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print("[OK] HTML 文件已保存: {}".format(output_file))


def main():
    # 文章 URL - 我的 Vibe Coding 项目
    url = "https://mp.weixin.qq.com/s/Z1HHOGPpNkhRYTOFl5UpNA"
    
    # 输出目录
    output_dir = "results/artifacts/wechat_scrapling"
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 60)
    print("Scrapling 微信公众号文章抓取测试")
    print("=" * 60)
    print()
    
    result = fetch_wechat_article(url, output_dir)
    
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
    
    if result.get('content_text'):
        print("\n内容长度: {} 字符".format(len(result['content_text'])))
        print("\n内容预览 (前500字符):")
        preview = result['content_text'][:500]
        # 处理编码问题，替换特殊字符
        safe_preview = preview.replace('\xa0', ' ').replace('\u200b', '')
        print(safe_preview)
        print("...")
    else:
        print("\n内容: 未提取到")
    
    if result.get('error'):
        print("\n错误: {}".format(result['error']))
    
    # 保存 JSON 结果
    json_file = os.path.join(output_dir, "wechat_article_result.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("\n[INFO] JSON 结果已保存到: {}".format(json_file))
    
    # 保存纯文本内容
    if result.get('content_text'):
        text_file = os.path.join(output_dir, "wechat_article_content.txt")
        with open(text_file, "w", encoding="utf-8") as f:
            f.write("标题: {}\n".format(result.get('title', 'N/A')))
            f.write("URL: {}\n".format(url))
            f.write("=" * 60 + "\n\n")
            f.write(result['content_text'])
        print("[INFO] 正文已保存到: {}".format(text_file))
    
    # 生成完整 HTML 文件
    if result.get('content_html'):
        html_file = os.path.join(output_dir, "wechat_article_final.html")
        generate_html(result, html_file)
    
    return 0 if result['success'] and result.get('content_text') else 1


if __name__ == "__main__":
    sys.exit(main())
