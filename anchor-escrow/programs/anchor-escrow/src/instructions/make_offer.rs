use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer_checked, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::constants::OFFER_SEED;
use crate::error::ErrorCode;
use crate::state::Offer;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct MakeOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(mint::token_program = token_program)]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        space = Offer::DISCRIMINATOR.len() + Offer::INIT_SPACE,
        seeds = [OFFER_SEED.as_bytes(), maker.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub offer: Account<'info, Offer>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> MakeOffer<'info> {
    pub fn save_escrow(
        &mut self,
        seed: u64,
        // token_a_offered_amount: u64,
        // token_b_offered_amount: u64,
        token_a_amount: u64,
        receive: u64,
        bumps: &MakeOfferBumps,
    ) -> Result<()> {
        require!(token_a_amount > 0, ErrorCode::InvalidAmount);
        require!(receive > 0, ErrorCode::InvalidAmount);

        require!(
            self.token_mint_a.key() != self.token_mint_b.key(),
            ErrorCode::InvalidTokenMint
        );

        self.offer.set_inner(Offer {
            seed,
            maker: self.maker.key(),
            token_mint_a: self.token_mint_a.key(),
            token_mint_b: self.token_mint_b.key(),
            receive,
            token_a_amount,
            bump: bumps.offer,
        });
        Ok(())
    }

    pub fn deposit_to_vault(&mut self, deposit: u64) -> Result<()> {
        require!(deposit > 0, ErrorCode::InvalidAmount);

        require!(
            self.maker_token_account_a.amount >= deposit,
            ErrorCode::InsufficientMakerBalance
        );

        let transfer_accounts = TransferChecked {
            from: self.maker_token_account_a.to_account_info(),
            mint: self.token_mint_a.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(self.token_program.to_account_info(), transfer_accounts);
        transfer_checked(cpi_ctx, deposit, self.token_mint_a.decimals)
    }
}
