// return date 
exports.returnDate = (date) => {
    let part = date.split('.');
    let topshiriqSana = new Date(`${part[2]}-${part[1]}-${part[0]}`);
    if (isNaN(Date.parse(topshiriqSana)) || part.length !== 3 ) return false
    return topshiriqSana
}

// return string  date 
exports.returnStringDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0'); // "05"
    let  month = (date.getMonth() + 1).toString().padStart(2, '0'); // "01"
    const year = date.getFullYear().toString(); // "2024"
    month = getMonth(month)
    return topshiriqSana = `${year}-йил ${day}-${month}`;
}

// need function 
function getMonth (month) {
    switch (month) {
        case "01":
            return 'январь';
        case "02":
            return 'февраль';
        case "03":
            return 'март';
        case "04":
            return 'апрель';
        case "05":
            return 'май';
        case "06":
            return 'июнь';
        case "07":
            return 'июль';
        case "08":
            return 'август';
        case "09":
            return 'сентябрь';
        case "10":
            return 'октябрь';
        case "11":
            return 'ноябрь';
        case "12":
            return 'декабрь';
        default:
            return 'server xatolik';
    }
}


// return local date 
exports.returnLocalDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0'); // "05"
    const  month = (date.getMonth() + 1).toString().padStart(2, '0'); // "01"
    const year = date.getFullYear().toString(); // "2024"
    return topshiriqSana = `${day}.${month}.${year}`;
}