import os
import django
from django.urls import get_resolver

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def get_urls():
    urlconf = get_resolver()
    all_urls = list()
    def list_urls(lis, acc=None):
        if acc is None:
            acc = []
        if not lis:
            return
        l = lis[0]
        if hasattr(l, 'url_patterns'):
            yield from list_urls(l.url_patterns, acc + [str(l.pattern)])
        else:
            yield acc + [str(l.pattern)]
        yield from list_urls(lis[1:], acc)

    for url in list_urls(urlconf.url_patterns):
        print(''.join(url))

if __name__ == '__main__':
    get_urls()
