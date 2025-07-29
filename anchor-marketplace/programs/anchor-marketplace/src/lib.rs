use anchor_lang::prelude::*;

mod state;
use state::*;

pub mod error;
use error::*;

pub mod constants;


use crate::error::ErrorMarketplace;
pub use constants::*;

mod instructions;
use instructions::*;
declare_id!("6ChRwmMvUGTQ54mHuCeQ245qnu3HooqcDcJnUuv8wV2n");

#[program]
pub mod marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        ctx.accounts.init(name, fee, &ctx.bumps)?;
        Ok(())
    }

    pub fn list(ctx: Context<List>, price: u64) -> Result<()> {
        require!(price > 0, ErrorMarketplace::ZeroPrice);
        ctx.accounts.create_listing(price, &ctx.bumps)?;
        ctx.accounts.deposit_nft()?;
        Ok(())
    }

    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.withdraw_nft()?;
        ctx.accounts.close_mint_vault()?;
        Ok(())
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.send_sol()?;
        ctx.accounts.send_nft()?;
        ctx.accounts.close_mint_vault()?;
        ctx.accounts.close_listing()?;
        Ok(())
    }
}
