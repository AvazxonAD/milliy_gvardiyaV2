exports.returnSumma = (workerSumma) => {
    let sum = 0
    for(let summa of workerSumma){
        sum += summa.summa
    }
    return sum
}