use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorMarketplace {
    #[msg("Custom error message")]
    CustomError,
    #[msg("Name too long")]
    LongName,
    #[msg("Empty name")]
    EmptyName,
    #[msg("Fee too high")]
    FeeTooHigh,
    #[msg("Price cannot be zero")]
    ZeroPrice,
    #[msg("No collection found in metadata")]
    NoCollection,
    #[msg("Invalid collection")]
    InvalidCollection,
    #[msg("Collection not verified")]
    CollectionNotVerified,
    #[msg("Insufficient token balance")]
    InsufficientBalance,
    #[msg("Not an NFT")]
    NotAnNFT,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid maker")]
    InvalidMaker,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Empty vault")]
    EmptyVault,
    #[msg("Tokens already in wallet")]
    TokensAlreadyInWallet,
}
