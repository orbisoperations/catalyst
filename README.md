CATALYST
=========

Catalyst is a federate data grid that facilitates sharing between organizations, teams, and products through the use of standard, open source, secure, and tested technology.

Catalyst was borne through the realization that many excellent data exchange platforms exist but they all require some level of onboarding into their platform. We wanted to build something that could achieve internet scale without having to be tied to a certain cloud provider, certain type of data storage, or any system where you lose custody of your data to make it "accessible".

## What is a Federated Data Grid

Federated Data Grid is our `fetch`. It is an opinionated collection of patterns to formalize data formats, data access, access control, and edge accessibility.

While `fetch` never took off, we are hoping that our design tennets do. The are:

* secure
* industry standard and  open protocols
* interoperability across systems, databases, and tech organizations
* open source
* internet scale


To achieve this we use:

* GraphQL - A felxible, well understood, data schema and API pattern
* GraphQL Stitching - We can create a single endpoint to access all data without having to move the data
* Cloudflare Workers - We write code designed to be ditributed running all over the world at once
* Zanzibar - RelBAC to make real time data sharing secure
* Asymmetric JWTs - Create secrets at the core and validate at the edge

## 