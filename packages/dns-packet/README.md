
# A minimal dns-packet library that implemented in `typescript`

This is a fork implementation of <https://github.com/lsongdev/node-dns>

## Building dns-proxy

```bash
yarn webpack
```

## Running dns-proxy

```powershell
yarn run webpack
$env:DNS_PORT="553"
node dist-webpack/dns-proxy.js `
--dns main 114.114.114.114 `
--dns main 223.5.5.5 `
--dns main 180.76.76.76 `
--dns auxiliary 1.1.1.1 `
--dns auxiliary 1.1.1.2 `
--dns default 114.114.114.114 `
--dns default 223.5.5.5 `
--dns default 180.76.76.76 `
--domain-list default examples/domain-list-main.txt `
--domain-list main examples/domain-list-main.txt `
--domain-list auxiliary examples/domain-list-auxiliary.txt `
--log auxiliary dist-webpack/auxiliary.log

```

Under Ubuntu

````bash
sudo /sbin/setcap 'cap_net_bind_service=ep' `which node`
node dist-webpack/dns-proxy.js  \
yarn ts-node examples/dns-proxy.ts \
--dns main 114.114.114.114 \
--dns main 223.5.5.5 \
--dns main 180.76.76.76 \
--dns auxiliary 1.1.1.1 \
--dns auxiliary 1.1.1.2 \
--dns default 114.114.114.114 \
--dns default 223.5.5.5 \
--dns default 180.76.76.76 \
--domain-list main examples/domain-list-main.txt \
--domain-list main examples/domain-list-main.txt \
--domain-list auxiliary examples/domain-list-auxiliary.txt \
--log auxiliary dist-webpack/auxiliary.log

dig baidu.com @127.0.0.1
dig mirrors.tuna.tsinghua.edu.cn @127.0.0.1
dig github.com @127.0.0.1
dig python.com @127.0.0.1
```
