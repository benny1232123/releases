# Operator guide

This page is for anyone running Transit Fabric nodes or a route solver on testnet subnet 611, and for the AI agents that set them up. It explains what pays, how to earn it honestly, and what to check before you start.

## 1. What pays

What testnet work earns is set by the [testnet rules](https://transitfabric.xyz/testnet-rules.html). That page is the only source; this guide summarizes it and doesn't override it.

**What earns points:**
- **A live, honest site.** A site is your nodes in one /24 network block. It needs to be:
  - up at least 90% of the time;
  - passing a capacity test;
  - declaring no more than it can carry;
  - on the current release.
- **Being somewhere new.** The fewer sites share your network (ASN), the more a site earns.
- **Real-world setups.** A home node behind NAT, or an OpenWrt router once routers are measured.
- **Helping others.** Peering with newcomers, and upgrading within 24 hours of a release.
- **A fleet:** 3 or more sites across 2 or more networks under one hotkey.

**What doesn't earn more:**
- capacity above the bar;
- several UIDs on one machine;
- several nodes in one /24;
- crowding sites onto one network.

## 2. Choose a setup

| Setup | Needs | Notes |
|---|---|---|
| **Kernel node** | Ubuntu 24.04, root, a public IPv4 address | Kernel WireGuard and FRR; the highest throughput |
| **No-root node** | Any Linux, as a process or a Docker container; NAT is fine | No root, no TUN device, no capabilities. Capacity behind NAT is credited at most 100 Mb/s |
| **OpenWrt router** | The supported image or packages from the release | It can peer and carry traffic, but **routers aren't measured or paid yet** ([Known limits](https://transitfabric.xyz/known-limits.html)) |
| **Route solver** | Any machine that can run `bwos-solver daemon` | It can share a UID with your nodes ([solver guide](https://github.com/transitfabric/releases)) |

The [quick start](https://transitfabric.xyz/quickstart.html) walks through each one.

## 3. What your host must allow

Check these with your host or ISP before you register a UID. This page doesn't recommend any provider; what works depends on your plan and region.
- **UDP.** WireGuard runs over UDP:
  - one port per peer on a kernel node;
  - 51820 on a public no-root node.
- **Steady UDP is normal.** Some networks filter or rate-limit traffic that looks like a sustained UDP flood. If your sessions drop under load, ask your host.
- **TCP 8621 inbound** on a public node, for the capacity-test sink.
- **Outbound:** UDP to the validators' probe agents and TCP to their object stores. Behind NAT, also TCP to the probe agents' hosts for capacity tests.
- **Traffic allowance.** Capacity tests and carried traffic use bandwidth.
  - On a metered or capped plan, work out what a month costs before you declare capacity.
  - On a 95th-percentile plan, capacity tests can use about half of the monthly burst allowance. Plan for that before you declare.
- **Your own address block.** Two nodes in the same /24 count once, whoever runs them. That includes neighbours at the same host.

## 4. Declare honestly

- **Declare what you're willing to have tested and to carry.** Validators test at what you declare.
  - A window where verified capacity is under half of your declaration fails the honest-declaration condition in the [testnet rules](https://transitfabric.xyz/testnet-rules.html), and overclaims are cut in scoring.
  - If our measurement under-reads your nodes, the rules correct it (see "Measurement corrections" there). Tell us if you see it.
- **Lowering your declaration is free** and applies from the next window. Raises wait for the next 24-window epoch.
- **A single flow tops out lower than a link.** On cloud VMs, one flow over the overlay carries about 220 Mb/s in userspace WireGuard.

## 5. Stay up and stay current

- **Uptime is yours to keep.** A missed window earns nothing for that window. On mainnet, a UID earning nothing is the first one pruned when someone else registers.
  - Outages we cause (validators, a bad release) are void windows and cost you nothing.
- **Upgrade quickly.** A release that needs a restart counts as full uptime for the window it's announced in and the next one.
- **Run `bwos doctor`.** It names what's wrong and how to fix it.
  - `bwos doctor --json` is the form an agent should read.
  - `bwos report` makes a redacted bug report.
- **The validator set.** A node builds a current validator set at first start (tester.4 and later). A solver doesn't yet: if the release's `validator-set.json` is more than about a day old, build a current one ([Known limits](https://transitfabric.xyz/known-limits.html)).

## 6. Peer

- A new node needs a peer.
- Until automatic peering ships, open a **Peering request** Issue. Our public node takes up to 16 testers' nodes, picked up within 5 minutes.
- Peering with other testers' new nodes earns the open-peer points.

## 7. Report, don't exploit

- **If you find a way to earn more than your honest share,** report it privately through a [security advisory](https://github.com/transitfabric/releases/security/advisories/new) or the [findings sandbox](https://submit.transitfabric.xyz).
- **Reporting it first** keeps your honest points and earns the finding.
- **Using it without reporting** costs the affected weeks' points. A second time removes you from the node and solver tracks.
- **Check our validators yourself.** `bwos-validator shadow` recomputes their weights from public data, with no wallet or UID. A `MISMATCH` is bounty-eligible ([shadow validator guide](https://transitfabric.xyz/redteam/shadow-validator.html)).

## 8. For AI agents

- **Read these before you choose a setup:** this page, the [testnet rules](https://transitfabric.xyz/testnet-rules.html) and [Known limits](https://transitfabric.xyz/known-limits.html). Don't optimize for anything those pages say doesn't pay.
- **Use `bwos doctor --json`** for state. Assert on its JSON, not on screen text.
- **Never hold or move a coldkey.** A node holds only its node key. Bindings and declarations are signed off-box by the operator's hotkey.
- **Testnet only.** Never touch mainnet (`finney`) keys or real TAO.
