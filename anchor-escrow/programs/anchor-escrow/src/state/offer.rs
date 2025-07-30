use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Offer {
    // Identifier of the offer
    pub seed: u64,
    // who made the offer
    pub maker: Pubkey,
    // token mint if the token being offered
    pub token_mint_a: Pubkey,
    // token mint of the token wanted
    pub token_mint_b: Pubkey,
    // amount being offered
    pub token_a_amount: u64,
    // The amount of token the maker wants to receive (in token B)
    pub receive: u64,
    // used to calculate address for this account, we save it as a performamnce optimization
    pub bump: u8,
}
