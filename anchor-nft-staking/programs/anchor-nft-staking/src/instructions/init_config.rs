use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::constants::{CONFIG_SEED, REWARDS_SEED};
use crate::state::StakeConfig;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
      init,
      payer = admin,
      seeds = [CONFIG_SEED.as_bytes()],
      bump,
      space = StakeConfig::DISCRIMINATOR.len() + StakeConfig::INIT_SPACE,
    )]
    pub config: Account<'info, StakeConfig>,

    #[account(
      init_if_needed,
      payer = admin,
      seeds = [REWARDS_SEED.as_bytes()],
      bump,
      mint::decimals = 6,
      mint::authority = config
    )]
    pub reward_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> InitializeConfig<'info> {
    pub fn initialize_config(
        &mut self,
        points_per_stake: u8,
        max_stake: u8,
        freeze_period: u32,
        bump: &InitializeConfigBumps,
    ) -> Result<()> {
        self.config.set_inner(StakeConfig {
            points_per_stake,
            max_stake,
            freeze_period,
            rewards_bump: bump.reward_mint,
            bump: bump.config,
        });

        Ok(())
    }
}
