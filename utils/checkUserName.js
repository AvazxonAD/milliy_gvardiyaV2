module.exports = (lastname, firstname, fatherName) => {
    // Tekshirish uchun RegExp ishlatamiz
    const isFirstCharUpperCase = /^[A-Z]/;

    // Tekshirish
    const isLastNameCapitalized = isFirstCharUpperCase.test(lastname);
    const isFirstNameCapitalized = isFirstCharUpperCase.test(firstname);
    const isFatherNameCapitalized = isFirstCharUpperCase.test(fatherName);

    // Natijani qaytarish
    return {
        lastname: isLastNameCapitalized,
        firstname: isFirstNameCapitalized,
        fatherName: isFatherNameCapitalized
    };
};

