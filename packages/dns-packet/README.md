
# A minimal dns-packet library that implemented in `typescript`

This is a fork implementation of <https://github.com/lsongdev/node-dns>

## Building dns-proxy

From the repo root:

```bash
yarn build
yarn run pack
```

From `packages/dns-packet`:

```bash
yarn run build
yarn run vite
```

## Running dns-proxy

Run the TypeScript source directly from the repo root (requires `tsx` from root
`devDependencies`):

```bash
node --import=tsx packages/dns-packet/examples/dns-proxy.ts --help
```

From `packages/dns-packet`:

```bash
node --import=tsx examples/dns-proxy.ts --help
```

Run the bundled binary after `yarn run pack`:

```powershell
$env:DNS_PORT="553"
node dist-vite/dns-proxy.cjs `
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
--log auxiliary dist-vite/auxiliary.log
```

Under Ubuntu (bundled binary):

```bash
sudo /sbin/setcap 'cap_net_bind_service=ep' `which node`
node dist-vite/dns-proxy.cjs \
--dns main 114.114.114.114 \
--dns main 223.5.5.5 \
--dns main 180.76.76.76 \
--dns auxiliary 1.1.1.1 \
--dns auxiliary 1.1.1.2 \
--dns default 114.114.114.114 \
--dns default 223.5.5.5 \
--dns default 180.76.76.76 \
--domain-list main examples/domain-list-main.txt \
--domain-list auxiliary examples/domain-list-auxiliary.txt \
--log auxiliary dist-vite/auxiliary.log

dig baidu.com @127.0.0.1
dig mirrors.tuna.tsinghua.edu.cn @127.0.0.1
dig github.com @127.0.0.1
dig python.com @127.0.0.1
```

## TODO list

* Add tcp listen support, for `nslookup -port=53 -type=any google.com  8.8.8.8`
