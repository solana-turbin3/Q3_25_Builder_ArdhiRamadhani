use anchor_lang::prelude::*;


pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("BbegZWhs4sUR644n7Yu7JQJnaNBhWBkRQ4hitkNKUHB5");

#[program]
pub mod anchor_escrow {
    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>,
        seed: u64,
        deposit: u64,
        receive: u64,
    ) -> Result<()> {
        ctx.accounts.deposit_to_vault(deposit)?;
        ctx.accounts.save_escrow(seed, deposit, receive, &ctx.bumps) // Pass deposit as token_a_amount
    }

    pub fn refund_offer(ctx: Context<RefundOffer>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()
    }

    pub fn take_offer(ctx: Context<TakeOffer>) -> Result<()> {
        ctx.accounts.deposit()?;
        ctx.accounts.withdraw_and_close_vault()
    }
}
