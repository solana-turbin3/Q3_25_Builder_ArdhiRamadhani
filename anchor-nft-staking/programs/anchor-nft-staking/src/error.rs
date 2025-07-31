use anchor_lang::prelude::*;

#[error_code]
pub enum StakeError {
    #[msg("You must wait the minimum freeze period before unstaking.")]
    FreezePeriodNotPassed,
}
