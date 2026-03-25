"""
简单的 HTTP 服务器用于测试 HTML 文件
"""

import http.server
import socketserver
import os
import webbrowser

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

os.chdir("results/artifacts/wechat_scrapling")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    url = "http://localhost:{}/wechat_article_final.html".format(PORT)
    print("服务器启动在: {}".format(url))
    print("按 Ctrl+C 停止服务器")
    webbrowser.open(url)
    httpd.serve_forever()
