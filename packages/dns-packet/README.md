
# A minimal dns-packet library that implemented in `typescript`

## Building dns-proxy

```bash
yarn webpack
```

## Running dns-proxy

```powershell
$env:DNS_PORT="553"
node dist-webpack/dns-proxy.js --main examples/domain-list-main.txt --main examples/domain-list-main.txt --auxiliary examples/domain-list-auxiliary.txt
yarn ts-node examples/dns-proxy.ts --main examples/domain-list-main.txt --main examples/domain-list-main.txt --auxiliary examples/domain-list-auxiliary.txt
```

Under Ubuntu

````bash
sudo /sbin/setcap 'cap_net_bind_service=ep' `which node`
node dist-webpack/dns-proxy.js  \
yarn ts-node examples/dns-proxy.ts \
--main-dns 114.114.114.114 \
--main-dns 223.5.5.5 \
--main-dns 180.76.76.76 \
--auxiliary-dns 1.1.1.1 \
--auxiliary-dns 1.1.1.2 \
--default-dns 114.114.114.114 \
--default-dns 223.5.5.5 \
--default-dns 180.76.76.76 \
--main examples/domain-list-main.txt \
--main examples/domain-list-main.txt \
--auxiliary examples/domain-list-auxiliary.txt \
--auxiliary-log dist-webpack/auxiliary.log

dig baidu.com @127.0.0.1
dig mirrors.tuna.tsinghua.edu.cn @127.0.0.1
dig github.com @127.0.0.1
dig python.com @127.0.0.1
```
