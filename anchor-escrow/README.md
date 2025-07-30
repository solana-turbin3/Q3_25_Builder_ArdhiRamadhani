
## Escrow

### State Config

* `seed: u64` — Unique identifier for the offer
* `maker: pubkey` — The user who creates the offer
* `token_mint_a: pubkey` — Token being offered by the maker
* `token_mint_b: pubkey` — Token expected in return
* `token_a_amount: u64` — Amount of `token_mint_a` offered
* `receive: u64` — Amount of `token_mint_b` expected
* `bump: u8` — PDA bump used for the offer account

---

### Deposit (Make Offer)

* Maker transfers `token_a_amount` of `token_mint_a`from their associated token account to a vault (PDA-owned ATA).
* Vault is created and owned by the offer account.
* Constraints:
  - `token_mint_a != token_mint_b`
  - `token_a_amount > 0`
  - `receive > 0`

---

### Refund (Cancel Offer)

* Transfers all tokens from the vault back to the maker
* Closes the vault account
* Closes the offer account
* Only callable by the original maker

---

### Take (Accept Offer)

* Taker sends `receive` amount of `token_mint_b`from their ATA to the maker's ATA
* Vault's entire balance of `token_mint_a` is sent to the taker
* Vault is closed
* Offer account is closed

---

### Atomicity Transaction

All of the func/operation need to pass to order transaction to pass
