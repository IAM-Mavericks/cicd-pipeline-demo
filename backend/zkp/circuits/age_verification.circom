pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";

/*
 * Age Verification Circuit
 * Proves that a user is at least minAge years old without revealing their exact date of birth.
 * 
 * Private Inputs:
 *   - birthYear: Year of birth (e.g., 1995)
 *   - birthMonth: Month of birth (1-12)
 *   - birthDay: Day of birth (1-31)
 * 
 * Public Inputs:
 *   - currentYear: Current year (e.g., 2026)
 *   - currentMonth: Current month (1-12)
 *   - currentDay: Current day (1-31)
 *   - minAge: Minimum required age (e.g., 18)
 * 
 * Output:
 *   - isValid: 1 if age >= minAge, 0 otherwise
 */

template AgeVerification() {
    // Private inputs (user's DOB - never revealed)
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    
    // Public inputs (verifiable by anyone)
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal input minAge;
    
    // Output signal
    signal output isValid;
    
    // Calculate age in years
    signal ageYears;
    ageYears <== currentYear - birthYear;
    
    // Check if birthday has occurred this year
    // birthdayOccurred = 1 if (currentMonth > birthMonth) OR (currentMonth == birthMonth AND currentDay >= birthDay)
    
    component monthGreater = GreaterThan(8);
    monthGreater.in[0] <== currentMonth;
    monthGreater.in[1] <== birthMonth;
    
    component monthEqual = IsEqual();
    monthEqual.in[0] <== currentMonth;
    monthEqual.in[1] <== birthMonth;
    
    component dayGreaterOrEqual = GreaterEqThan(8);
    dayGreaterOrEqual.in[0] <== currentDay;
    dayGreaterOrEqual.in[1] <== birthDay;
    
    signal monthAndDay;
    monthAndDay <== monthEqual.out * dayGreaterOrEqual.out;
    
    signal birthdayOccurred;
    birthdayOccurred <== monthGreater.out + monthAndDay;
    
    // Actual age = ageYears if birthday occurred, ageYears - 1 otherwise
    signal actualAge;
    actualAge <== ageYears - (1 - birthdayOccurred);
    
    // Check if actualAge >= minAge
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== actualAge;
    ageCheck.in[1] <== minAge;
    
    isValid <== ageCheck.out;
}

component main {public [currentYear, currentMonth, currentDay, minAge]} = AgeVerification();
