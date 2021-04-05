const fileSelector = document.getElementById('file-selector')
const intervalSelector = document.getElementById('interval-selector')
const exportBtn = document.getElementById('export-button')
const radioBtns = document.querySelectorAll('.radio-btn')
const exportSettings = document.getElementById('export-settings')
let data, output, content, preparedData;

/* 
Data Fields:
    Name (Original Name),
    User Email,
    Join Time,
    Leave Time,
    Duration (Minutes),
    Guest
*/

const settings = {
    reportType: 'Usage',
    timeInterval: parseInt(intervalSelector.value), // 5 minutes interval
    exportFormat: 'csv' // csv or json
}

Chart.defaults.global.defaultFontFamily = 'Lato'

let myChart;

const readFileAsync = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(csvParse(reader.result))
        }
        reader.onerror = reject
        reader.readAsText(file)
    })
}

const csvParse = (csv) => {
    const rows = csv.split('\n')
    const output = []
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].split(',')
        output.push({
            'Name (Original Name)': row[0],
            'User Email': row[1],
            'Join Time': row[2],
            'Leave Time': row[3],
            'Duration (Minutes)': row[4],
            'Guest': row[5]
        })
    }
    return output
}

intervalSelector.addEventListener('change', (e) => {
    settings.timeInterval = parseInt(intervalSelector.value)
    if (data) {
        output = genAttnCount(data)
        genChart(output)
        prepDownload(output)
    }
})

fileSelector.addEventListener('change', async (event) => {

    const fileList = event.target.files;
    data = await readFileAsync(fileList[0])
    output = genAttnCount(data)
    genChart(output)
    exportSettings.classList.remove('d-none')
    prepDownload(output)

});

radioBtns.forEach((elem) => {
    elem.addEventListener('change', (e) => {
        settings.exportFormat = e.target.value
        if (output) {
            prepDownload(output)
        }
    })
})

function prepDownload(output) {

    if (settings.exportFormat === 'csv') {
        content = output.labels.join(",") + "\r\n" + output.count.join(",")
    } else if (settings.exportFormat === 'json') {
        content = JSON.stringify(output)
    }
    preparedData = `data:text/${settings.exportFormat};charset=utf-8,` + encodeURIComponent(content)

    exportBtn.href = preparedData
    exportBtn.download = `results.${settings.exportFormat}`
}

function genChart(output) {

    if (myChart) {
        myChart.destroy()
    }

    const labelsForChart = []

    output.labels.forEach(label => {
        labelsForChart.push(new Date(label))
    })

    const chartElem = document.getElementById('chart')
    const ctx = chartElem.getContext('2d')
     myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsForChart,
            datasets: [{
                label: '# of attendees',
                data: output.count,
                backgroundColor: 'rgba(0,123,255,0.2)',
                borderColor: 'rgba(0,123,255,1)',
                borderWidth: 2,
                pointRadius: 2,
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        displayFormats: {
                            minute: 'h:mm a'
                        }
                    },
                }]
            }
        }
    })
    chartElem.classList.remove('d-none')
}

function exportOutput(output, format) {
    switch (format) {
        case 'jsv':
            break;
        case 'csv':
            break;
        case 'txt':
            break;
    }
    return
}

function genAttnCount(data) {

    // convert Join Time and Leave Time to Date object instead of string 
    data.forEach( (row) => {
        row['Join Time'] = convertTime(row['Join Time'])
        row['Leave Time'] = convertTime(row['Leave Time'])
    })

    // find the earliest Join Time and latest Leave Time
    const timeRange = findMinMaxTime(data)

    // generate a list of time stamps as labels
    const timeStamps = genTimeStamps(timeRange)

    // loop through attendance records JSON to get attendance count per time interval
    data.forEach( (row) => {
        const lowerBoundIdx = getTimeIdx(findTimeBound(row['Join Time'], 'lower'))
        const upperBoundIdx = getTimeIdx(findTimeBound(row['Leave Time'], 'upper'))
        let i = lowerBoundIdx + settings.timeInterval
        while(i < upperBoundIdx) {
            timeStamps[i].count += 1
            i += settings.timeInterval
        }
    })

    // generate the output arrays 
    const output = {
        labels: [],
        count: [],
    }

    for (const [key, value] of Object.entries(timeStamps)) {
        output.labels.push(value.timeStamp.toLocaleString().replace(',', ''))
        output.count.push(value.count)
    }
    
    return output
}

function convertTime(timeStr) { // convert the Join Time / Leave Time string into a Date Object
    return new Date(Date.parse(timeStr))
}

function findMinMaxTime(attnRec) { // input: attendance records in JSON format after converting time format
    const timeRange = {
        min: attnRec[0]['Join Time'],
        max: attnRec[0]['Leave Time']
    }
    attnRec.forEach((row) => {
        if (row['Join Time'] < timeRange.min) {
            timeRange.min = row['Join Time']
        }
        if (row['Leave Time'] > timeRange.max) {
            timeRange.max = row['Leave Time']
        }
    })
    return timeRange
}

function findTimeBound(timeObj, option) { // inputs: a time object + options 'lower' or 'upper'
    const timeMinutes = timeObj.getUTCMinutes()
    const newMinutes = option === 'lower' ? 
         Math.floor(timeMinutes / settings.timeInterval) * settings.timeInterval : 
        (Math.floor(timeMinutes / settings.timeInterval) + 1) * settings.timeInterval
    const newTimeObj = {
        year: timeObj.getFullYear(),
        month: timeObj.getMonth(),
        date: timeObj.getDate(),
        hours: timeObj.getHours(),
        minutes: newMinutes,
    }
    return new Date(newTimeObj.year, 
                    newTimeObj.month, 
                    newTimeObj.date, 
                    newTimeObj.hours, 
                    newTimeObj.minutes)
}

function findNextInterval(timeObj) {
    return new Date(timeObj.getTime() + settings.timeInterval * 60 * 1000)
}

function genTimeStamps(timeRange) {
    const timeStamps = {
        // timeStampIdx: { 
            // timeStamp: dateObj,
            // count: 0,
        // }
    };

    const timeLowerBound = findTimeBound(timeRange.min, 'lower')
    const timeUpperBound = findTimeBound(timeRange.max, 'upper')

    const timeLowerBoundIdx = getTimeIdx(timeLowerBound)
    const timeUpperBoundIdx = getTimeIdx(timeUpperBound)

    timeStamps[timeLowerBoundIdx] = {
        timeStamp: timeLowerBound,
        count: 0,
    }

    let i = findNextInterval(timeLowerBound)

    while (i < timeUpperBound) {
        timeStamps[getTimeIdx(i)] = {
            timeStamp: i,
            count: 0
        }
        i = findNextInterval(i)
    }

    timeStamps[timeUpperBoundIdx] = {
        timeStamp: timeUpperBound,
        count: 0,
    }

    return timeStamps

}

function getTimeIdx(timeObj) {
    return timeObj.getHours() * 60 + timeObj.getMinutes()
}
