# FAQ

## Who are the customers?

Anyone who needs diverse, measured paths between networks but can't build or lease a global backbone:
- mid-size clouds and GPU or AI-inference clouds;
- CDNs;
- gaming;
- enterprises and SD-WAN users.

## How do customers buy capacity?

Customers buy from a **reseller**: a VPN, an ISP, a broker, or BandwidthOS, the first reference implementation. They pay in whatever currency the reseller accepts.
- **The fabric fee.** The reseller buys capacity on a lane, an ordered pair of gateways run by different operators. Prices are quoted in US dollars on a rate card the validators sign each window. The reseller pays the fabric fee by burning TAO: it buys the subnet's alpha and destroys it in the same call. Nobody, the team included, receives that payment.
- **The port fee.** The reseller pays each gateway a port fee in TAO directly.
- **How it clears.** Each window's bids clear in one uniform-price auction per lane, and the price rises as the lane fills.
- **Not live yet.** The gateway and purchase path is being built. The [whitepaper](https://transitfabric.xyz/redteam/whitepaper.html), §6.2, has the detail.

## Who are the operators?

**Operators are the supply side.** They are anyone with network capacity to sell. Today they are often companies paying for more IP transit than they use, or servers in data centres and homes. A company can be both: an operator selling its idle headroom, and a customer buying diverse paths it lacks.

## Don't Google and Microsoft already have their own backbones?

They run huge private backbones and own or co-own many subsea cables. They still lease a lot of terrestrial fiber and wavelengths, partly for path diversity, so that one cut or conduit doesn't take out both directions.

Almost no one else can do that. Transit Fabric gives everyone else a multi-operator fabric with measured, diverse paths.

## What's wrong with today's IP transit?

- **Routing ignores performance.** Routing between networks (BGP-4, from 1994) picks paths by business policy and AS-path length, not by measured latency, loss or capacity.
- **Commitments are bulk.** Most networks buy it as bulk transit commitments, and much of that capacity sits idle most of the day.
- **What we do instead.** Transit Fabric measures paths continuously, and route solvers compete to produce the table the network runs.

## How does an operator get paid, and does carrying fabric traffic raise their costs?

- **How billing works.** Transit is usually billed at the 95th percentile: 5-minute samples, with the top 5% of the month (about 36 hours) discarded. You pay for the highest remaining sample, or your commit, whichever is higher.
- **Headroom is nearly free to sell, up to your own busy hour.** What you can carry without changing your bill is your commit minus your own busy-hour traffic (roughly your own 95th percentile), not minus your average. A 10 Gbps commit averaging 4 Gbps, with a busy hour at 1.7 times the average, has about 3 Gbps free around the clock, not 6.
- **Above your commit, it costs you.** If fabric traffic pushes your 95th percentile above your commit, you pay overage. Off-peak traffic barely moves your 95th percentile; traffic at your own peak moves it most.
- **You stay in control.** You declare the capacity you offer, and you can lower it at any time from the next window. Declare only the headroom you want to sell.
- **As the network grows,** we plan extra pay for capacity delivered where the network needs it, measured by low latency to points inside under-served regions (a proposed coverage incentive, after launch; not active yet).

## What happens when operators' idle headroom fills up?

The fabric stops being able to use free headroom alone. Pay has to beat each operator's marginal transit price.
- A coverage incentive (proposed, after launch) is meant to pay more for capacity delivered where the network is short, so adding capacity there becomes worth it.
- Bulk transfers could be shifted into quiet hours (a proposed `transfer` class, not built), which keeps operators' 95th percentiles down.

## Do I need to be a big network to take part?

No. A node can be:
- a VPS;
- a bare-metal server;
- a home server behind NAT;
- an OpenWrt router.

Each UID is an operator. One UID can run a fleet of up to 128 counted nodes. Joining another operator's fleet without your own UID is planned for mainnet. An OpenWrt router can join and carry traffic today, but **router nodes aren't measured or paid yet** ([Known limits](https://transitfabric.xyz/known-limits.html)). Native BGP, or BGP over WireGuard inside a data centre, is the path at scale. The no-root node needs no special privileges at all.

## Is this live?

It's on Bittensor testnet (subnet 611). Under the [testnet rules](https://transitfabric.xyz/testnet-rules.html), testnet work earns credit toward a discretionary reward of mainnet alpha, if mainnet launches; the rules set out the conditions. Mainnet comes later.

## Do capacity tests raise my 95th percentile bill?

- **How often and how long.** Validators test each node about every 3 hours, on a schedule nobody can predict (`CAP_TEST_PERIOD`, 900 blocks). That is about 240 tests a month. Each lasts 10 seconds today; a longer 60-second test is planned.
- **What a test adds to a sample.** A test at your declared rate `R` lifts one 5-minute sample by about `R/30` for a 10-second test, or `R/5` for a 60-second test. It lifts two samples if it straddles a boundary.
- **Against your burst allowance.** The 95th percentile discards the month's top 432 samples. The tests take up roughly half of that allowance. On their own they don't set your bill. If you already burst a lot, they can push your 95th percentile up a little, by up to about `R/5` once tests run for 60 seconds.
- **Declare what you're willing to have tested.** The test runs at what you declare.

## Are these questions stupid?

No. Reality-testing the economics is exactly what testers are for. Ask in Discord or open an Issue.

