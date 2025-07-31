use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        mpl_token_metadata::instructions::{
            FreezeDelegatedAccountCpi,
            FreezeDelegatedAccountCpiAccounts
        },
        MasterEditionAccount,
        Metadata,
        MetadataAccount,
    },
    token::{
        Approve,
        approve,
        Mint,
        Token,TokenAccount
    },
};

use crate::{state::StakeAccount, StakeConfig, UserAccount};
use crate::constants::{USER_SEED, METADATA_SEED, CONFIG_SEED, STAKE_SEED};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: Account<'info, Mint>,
    pub collection_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub mint_ata: Account<'info, TokenAccount>,

    #[account(
        seeds = [USER_SEED.as_bytes(), user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(
        seeds = [METADATA_SEED.as_bytes(), metadata_program.key().as_ref(), mint.key().as_ref()],
        seeds::program = metadata_program.key(),
        bump,
        
        constraint = metadata.collection.as_ref().unwrap().key.as_ref() == collection_mint.key().as_ref(),
        constraint = metadata.collection.as_ref().unwrap().verified,
    )]
    pub metadata: Account<'info, MetadataAccount>,

    #[account(
        seeds = [
            METADATA_SEED.as_bytes(), 
            metadata_program.key().as_ref(), 
            mint.key().as_ref()
            ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub edition: Account<'info, MasterEditionAccount>,

     #[account(
        seeds = [CONFIG_SEED.as_bytes()],
        bump = config.bump,
    )]
    pub config: Account <'info, StakeConfig>,

    #[account(
        init,
        payer = user,
        space = StakeAccount::DISCRIMINATOR.len() + StakeAccount::INIT_SPACE,
        seeds = [STAKE_SEED.as_bytes(), mint.key().as_ref(), config.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
}

impl<'info> Stake <'info> {
    pub fn stake(&mut self, bump: &StakeBumps) -> Result<()> {
        // Ensure user has not exceeded the max allowed staked NFTs
        assert!(self.user_account.amount_staked < self.config.max_stake);
        
        // Initialize StakeAccount to record NFT staking details
        self.stake_account.set_inner(StakeAccount {
            owner: self.user.key(),
            mint: self.mint.key(),
            staked_at: Clock::get()?.unix_timestamp,
            bump: bump.stake_account
        });

        // Approve the StakeAccount as a delegate with authority to manage 1 token (NFT)
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Approve {
            to: self.mint_ata.to_account_info(),
            delegate: self.stake_account.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        approve(cpi_ctx, 1)?;
        // Seeds for program-derived address (PDA) signing (used in freeze below)
        let seeds = &[
            STAKE_SEED.as_bytes(),
            self.mint.to_account_info().key.as_ref(),
            self.config.to_account_info().key.as_ref(),
            &[self.stake_account.bump]
        ];

        let signer_seeds = &[&seeds[..]];

        let delegate = &self.stake_account.to_account_info();
        let token_account = &self.mint_ata.to_account_info();
        let edition = &self.edition.to_account_info();
        let mint = &self.mint.to_account_info();
        let token_program = &self.token_program.to_account_info();
        let metadata_program = &self.metadata_program.to_account_info();

        // Freeze the user's NFT ATA to lock it during staking
        FreezeDelegatedAccountCpi::new(
            metadata_program,
            FreezeDelegatedAccountCpiAccounts{
                delegate,
                token_account,
                edition,
                mint,
                token_program
            }
        ).invoke_signed(signer_seeds)?;

        // Increment the user's staked count
        self.user_account.amount_staked += 1;

        Ok(())
    }
}