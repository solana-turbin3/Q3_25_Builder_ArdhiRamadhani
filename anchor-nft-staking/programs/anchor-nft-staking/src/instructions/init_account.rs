use anchor_lang::prelude::*;
use anchor_spl::token::Token;

use crate::constants::USER_SEED;
use crate::state::UserAccount;

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        seeds = [USER_SEED.as_bytes()],
        bump,
        space = UserAccount::DISCRIMINATOR.len() + UserAccount::INIT_SPACE,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> InitializeUser<'info> {
    pub fn initialize_user(&mut self, bump: &InitializeUserBumps) -> Result<()> {
        self.user_account.set_inner(UserAccount {
            points: 0,
            amount_staked: 0,
            bump: bump.user_account,
        });

        Ok(())
    }
}
