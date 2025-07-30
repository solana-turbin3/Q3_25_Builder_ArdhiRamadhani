use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

use crate::constants::OFFER_SEED;
use crate::error::ErrorCode;
use crate::state::Offer;

#[derive(Accounts)]
pub struct RefundOffer<'info> {
    #[account(mut)]
    maker: Signer<'info>,

    #[account(mint::token_program = token_program)]
    token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program  = token_program,
    )]
    maker_token_account_a: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        close = maker,
        has_one = token_mint_a,
        has_one = maker,
        seeds = [OFFER_SEED.as_bytes(), maker.key().as_ref(), offer.seed.to_le_bytes().as_ref()],
        bump = offer.bump
    )]
    offer: Account<'info, Offer>,
    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Interface<'info, TokenInterface>,
    system_program: Program<'info, System>,
}

impl<'info> RefundOffer<'info> {
    pub fn refund_and_close_vault(&mut self) -> Result<()> {
        require!(self.vault.amount > 0, ErrorCode::InvalidAmount);

        let signer_seeds: [&[&[u8]]; 1] = [&[
            OFFER_SEED.as_bytes(),
            self.maker.to_account_info().key.as_ref(),
            &self.offer.seed.to_le_bytes()[..],
            &[self.offer.bump],
        ]];

        let xfer_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.token_mint_a.to_account_info(),
            to: self.maker_token_account_a.to_account_info(),
            authority: self.offer.to_account_info(),
        };

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            xfer_accounts,
            &signer_seeds,
        );

        transfer_checked(ctx, self.vault.amount, self.token_mint_a.decimals)?;

        let close_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.offer.to_account_info(),
        };

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            close_accounts,
            &signer_seeds,
        );

        close_account(ctx)
    }
}
