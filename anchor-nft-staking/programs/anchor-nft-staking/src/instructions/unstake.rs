use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        mpl_token_metadata::instructions::{
            ThawDelegatedAccountCpi, ThawDelegatedAccountCpiAccounts,
        },
        MasterEditionAccount, Metadata,
    },
    token::{revoke, Mint, Revoke, Token, TokenAccount},
};

use crate::{
    constants::{CONFIG_SEED, EDITION_SEED, METADATA_SEED, STAKE_SEED, USER_SEED},
    error::StakeError,
    state::{StakeAccount, StakeConfig, UserAccount},
};

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub mint_ata: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            METADATA_SEED.as_bytes(),
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
            EDITION_SEED.as_bytes()
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub edition: Account<'info, MasterEditionAccount>,
    #[account(
        seeds = [CONFIG_SEED.as_bytes()],
        bump = config.bump,
    )]
    pub config: Account<'info, StakeConfig>,
    #[account(
        mut,
        close = user,
        seeds = [STAKE_SEED.as_bytes(), mint.key().as_ref(), config.key().as_ref()],
        bump = stake_account.bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(
        mut,
        seeds = [USER_SEED.as_bytes(), user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
}

impl<'info> Unstake<'info> {
    pub fn unstake(&mut self) -> Result<()> {
        let time_elapsed =
            ((Clock::get()?.unix_timestamp - self.stake_account.staked_at) / 86400) as u32;

        require!(
            time_elapsed >= self.config.freeze_period,
            StakeError::FreezePeriodNotPassed
        );

        self.user_account.points += time_elapsed * self.config.points_per_stake as u32;
        self.user_account.amount_staked = self.user_account.amount_staked.saturating_sub(1);

        let mint_key = self.mint.key();
        let config_key = self.config.key();
        let bump = self.stake_account.bump;
        let bump_slice: &[u8] = &[bump];
        let signer_seeds = &[&[
            STAKE_SEED.as_bytes(),
            mint_key.as_ref(),
            config_key.as_ref(),
            bump_slice,
        ][..]];

        ThawDelegatedAccountCpi::new(
            &self.metadata_program.to_account_info(),
            ThawDelegatedAccountCpiAccounts {
                delegate: &self.stake_account.to_account_info(),
                token_account: &self.mint_ata.to_account_info(),
                edition: &self.edition.to_account_info(),
                mint: &self.mint.to_account_info(),
                token_program: &self.token_program.to_account_info(),
            },
        )
        .invoke_signed(signer_seeds)?;

        let cpi_ctx = CpiContext::new(
            self.token_program.to_account_info(),
            Revoke {
                source: self.mint_ata.to_account_info(),
                authority: self.user.to_account_info(),
            },
        );
        revoke(cpi_ctx)?;

        Ok(())
    }
}
