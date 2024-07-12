exports.getWorkerAllMoney = (tasks) => {
    let AllMoney = 0
    for(let task of tasks){
        console.log(typeof task.summa)
        AllMoney = AllMoney + task.summa
    }
    return AllMoney
}

// block task 
exports.blockTask = (tasks) => {
    let result = []
    for(let task of tasks){
        if(task.inprogress){
            const dateObject = new Date(task.taskdate)
            dateObject.setDate(dateObject.getDate() + 2);
            if(dateObject.getTime() < new Date().getTime()){
                result.push({
                    id: task.id, 
                    notdone: true
                })
            }
        }
    }
    return result
}
 