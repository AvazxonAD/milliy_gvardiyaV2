module.exports = (fio) => {
    const fioPattern = /^[A-ZА-ЯЁЎҚҒҲ][a-zа-яёқғҳ']* [A-ZА-ЯЁЎҚҒҲ][a-zа-яёқғҳ']* [A-ZА-ЯЁЎҚҒҲ][a-zа-яёқғҳ']*(ович|евна|овна|ович|оғли|қизи|og'li|qizi)?$/;
    return fioPattern.test(fio);
};

