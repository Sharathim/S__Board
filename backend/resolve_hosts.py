import socket

hosts = [
    'www.googleapis.com',
    'securetoken.googleapis.com',
    'oauth2.googleapis.com',
]

lines = []
for h in hosts:
    try:
        ip = socket.getaddrinfo(h, 443, socket.AF_INET)[0][4][0]
        lines.append(f'{ip} {h}')
        print(f'Resolved {h} -> {ip}')
    except Exception as e:
        print(f'Could not resolve {h}: {e}')

with open('/google_hosts_cache', 'w') as f:
    f.write('\n'.join(lines) + '\n')

print('Saved to /google_hosts_cache')
