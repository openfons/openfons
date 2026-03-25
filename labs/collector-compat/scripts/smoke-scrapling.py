"""
Scrapling 兼容性冒烟测试
验证安装、导入和基本功能
"""

import sys

def test_import():
    """测试导入"""
    try:
        from scrapling import Fetcher, AsyncFetcher
        print("[OK] scrapling 导入成功")
        print(f"  - Fetcher: {Fetcher}")
        print(f"  - AsyncFetcher: {AsyncFetcher}")
        return True
    except ImportError as e:
        print(f"[FAIL] scrapling 导入失败: {e}")
        return False

def test_fetcher_creation():
    """测试 Fetcher 实例化"""
    try:
        from scrapling import Fetcher
        fetcher = Fetcher()
        print("[OK] Fetcher 实例化成功")
        return True
    except Exception as e:
        print(f"[FAIL] Fetcher 实例化失败: {e}")
        return False

def test_async_fetcher_creation():
    """测试 AsyncFetcher 实例化"""
    try:
        from scrapling import AsyncFetcher
        fetcher = AsyncFetcher()
        print("[OK] AsyncFetcher 实例化成功")
        return True
    except Exception as e:
        print(f"[FAIL] AsyncFetcher 实例化失败: {e}")
        return False

def test_fetch_example():
    """测试抓取 example.com"""
    try:
        from scrapling import Fetcher
        fetcher = Fetcher()
        page = fetcher.get("https://example.com")
        title = page.css_first("h1").text
        print(f"[OK] 抓取 https://example.com 成功")
        print(f"  - 页面标题: {title}")
        return True
    except Exception as e:
        print(f"[FAIL] 抓取失败: {e}")
        return False

def main():
    print("=" * 50)
    print("Scrapling 兼容性冒烟测试")
    print("=" * 50)
    
    results = []
    
    # 测试 1: 导入
    print("\n[测试 1] 导入测试")
    results.append(("导入", test_import()))
    
    # 测试 2: Fetcher 实例化
    print("\n[测试 2] Fetcher 实例化")
    results.append(("Fetcher 实例化", test_fetcher_creation()))
    
    # 测试 3: AsyncFetcher 实例化
    print("\n[测试 3] AsyncFetcher 实例化")
    results.append(("AsyncFetcher 实例化", test_async_fetcher_creation()))
    
    # 测试 4: 真实抓取
    print("\n[测试 4] 真实抓取测试")
    results.append(("抓取 example.com", test_fetch_example()))
    
    # 汇总
    print("\n" + "=" * 50)
    print("测试结果汇总")
    print("=" * 50)
    passed = sum(1 for _, r in results if r)
    total = len(results)
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status}: {name}")
    print(f"\n总计: {passed}/{total} 通过")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
