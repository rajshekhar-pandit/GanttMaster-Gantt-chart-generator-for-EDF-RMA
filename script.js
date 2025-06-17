// Process colors for Gantt chart
const processColors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
    '#1abc9c', '#d35400', '#34495e', '#16a085', '#c0392b'
];

let currentAlgorithm = '';
let processes = [];
let lcmPeriod = 1;

// DOM Elements
const processSelectionSection = document.getElementById('process-selection');
const parameterInputSection = document.getElementById('parameter-input');
const numProcessesInput = document.getElementById('numProcesses');
const processInputsDiv = document.getElementById('process-inputs');
const arrivalTimeSlider = document.getElementById('arrivalTime');
const arrivalValueSpan = document.getElementById('arrivalValue');
const algorithmTitle = document.getElementById('algorithm-title');
const ganttContainer = document.getElementById('gantt-container');
const modal = document.getElementById('schedulabilityModal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const proceedBtn = document.getElementById('proceedBtn');
const cancelBtn = document.getElementById('cancelBtn');
const closeBtn = document.querySelector('.close-btn');

// Event Listeners
document.getElementById('edfBtn').addEventListener('click', () => {
    currentAlgorithm = 'EDF';
    showParameterInput();
});

document.getElementById('rmaBtn').addEventListener('click', () => {
    currentAlgorithm = 'RMA';
    showParameterInput();
});

document.getElementById('startSimulation').addEventListener('click', startSimulation);
arrivalTimeSlider.addEventListener('input', updateArrivalTime);

// Modal event listeners
proceedBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    generateGanttChart();
});

cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Update arrival time display
function updateArrivalTime() {
    arrivalValueSpan.textContent = arrivalTimeSlider.value;
}

// Show parameter input section
function showParameterInput() {
    const numProcesses = parseInt(numProcessesInput.value);
    algorithmTitle.textContent = `${currentAlgorithm} Parameters`;
    
    // Generate input fields
    processInputsDiv.innerHTML = '';
    for (let i = 0; i < numProcesses; i++) {
        const processDiv = document.createElement('div');
        processDiv.className = 'process-row';
        
        processDiv.innerHTML = `
            <label>Process ${i+1} Name:</label>
            <input type="text" id="name-${i}" value="P${i+1}" placeholder="Process ${i+1}">
            
            <label>Period:</label>
            <input type="number" id="period-${i}" min="1" value="${(i+1)*5}">
            
            <label>Duration:</label>
            <input type="number" id="duration-${i}" min="1" value="${i+1}">
            
            ${currentAlgorithm === 'EDF' ? `
            <label>Deadline:</label>
            <input type="number" id="deadline-${i}" min="1" value="${(i+1)*5}">
            ` : ''}
        `;
        
        processInputsDiv.appendChild(processDiv);
    }
    
    processSelectionSection.classList.remove('active');
    parameterInputSection.classList.add('active');
    ganttContainer.innerHTML = '';
}

// Calculate GCD of two numbers
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

// Calculate LCM of two numbers
function lcm(a, b) {
    return (a * b) / gcd(a, b);
}

// Calculate LCM of all periods
function calculateLCM() {
    const periods = processes.map(p => p.period);
    let currentLCM = periods[0];
    
    for (let i = 1; i < periods.length; i++) {
        currentLCM = lcm(currentLCM, periods[i]);
    }
    
    return currentLCM;
}

// Check EDF schedulability (Liu & Layland condition)
function isEDFSchedulable() {
    const utilization = processes.reduce((sum, process) => {
        return sum + (process.duration / process.period);
    }, 0);
    
    return utilization <= 1;
}

// Check RMA schedulability using both Liu & Layland and Lehoczky's theorem
function checkRMASchedulability() {
    const n = processes.length;
    const utilization = processes.reduce((sum, process) => {
        return sum + (process.duration / process.period);
    }, 0);
    
    // Liu & Layland bound
    const liuLaylandBound = n * (Math.pow(2, 1/n) - 1);
    const passesLiuLayland = utilization <= liuLaylandBound;
    
    // Lehoczky's exact test
    const passesLehoczky = isRMASchedulableLehoczky();
    
    return {
        passesLiuLayland,
        passesLehoczky,
        utilization,
        bound: liuLaylandBound
    };
}

// Lehoczky's exact schedulability test for RMA
function isRMASchedulableLehoczky() {
    // Sort tasks by period (RM priority order)
    const sortedProcesses = [...processes].sort((a, b) => a.period - b.period);
    
    for (let i = 0; i < sortedProcesses.length; i++) {
        const process = sortedProcesses[i];
        let R_prev = 0;
        let R = process.duration;
        
        while (R_prev !== R) {
            R_prev = R;
            R = process.duration;
            
            for (let j = 0; j < i; j++) {
                R += Math.ceil(R_prev / sortedProcesses[j].period) * sortedProcesses[j].duration;
            }
            
            if (R > process.period) {
                return false; // Deadline miss
            }
        }
    }
    return true;
}

// Start simulation
function startSimulation() {
    const numProcesses = parseInt(numProcessesInput.value);
    const arrivalTime = parseInt(arrivalTimeSlider.value);
    
    // Collect process data
    processes = [];
    for (let i = 0; i < numProcesses; i++) {
        processes.push({
            name: document.getElementById(`name-${i}`).value,
            period: parseInt(document.getElementById(`period-${i}`).value),
            duration: parseInt(document.getElementById(`duration-${i}`).value),
            deadline: currentAlgorithm === 'EDF' ? 
                parseInt(document.getElementById(`deadline-${i}`).value) : 
                parseInt(document.getElementById(`period-${i}`).value),
            color: processColors[i % processColors.length]
        });
    }
    
    if (currentAlgorithm === 'EDF') {
        // EDF logic
        const utilization = processes.reduce((sum, process) => {
            return sum + (process.duration / process.period);
        }, 0);
        
        if (utilization > 1) {
            modalTitle.textContent = 'EDF Schedulability Warning';
            modalTitle.style.color = 'var(--warning-color)';
            modalMessage.innerHTML = `
                The given inputs are not schedulable under EDF:<br>
                - Utilization: ${utilization.toFixed(3)} > 1.000 (EDF bound)
                <br><br>
                EDF requires the total utilization to be ≤ 1 for schedulability
            `;
            modal.style.display = 'block';
        } else {
            generateGanttChart();
        }
    } else {
        // RMA with dual checks
        const rmaCheck = checkRMASchedulability();
        
        if (!rmaCheck.passesLiuLayland) {
            modalTitle.textContent = 'RMA Schedulability Warning';
            modalTitle.style.color = 'var(--warning-color)';
            
            if (rmaCheck.passesLehoczky) {
                modalMessage.innerHTML = `
                    1. The given inputs are not schedulable under RMA (Liu & Layland condition not satisfied).<br><br>
                    2. However, this task set may still be schedulable according to Lehoczky's theorem.
                    <br><br>
                    Utilization: ${rmaCheck.utilization.toFixed(3)} > ${rmaCheck.bound.toFixed(3)} (Liu & Layland bound)
                `;
            } else {
                modalMessage.innerHTML = `
                    The given inputs are not schedulable under RMA:<br>
                    - Liu & Layland condition failed (U = ${rmaCheck.utilization.toFixed(3)} > ${rmaCheck.bound.toFixed(3)})<br>
                    - Lehoczky's test also failed
                `;
            }
            modal.style.display = 'block';
        } else {
            generateGanttChart();
        }
    }
}


// Generate Gantt chart after schedulability check
function generateGanttChart() {
    const arrivalTime = parseInt(arrivalTimeSlider.value);
    
    // Calculate LCM of periods for the timeline
    lcmPeriod = calculateLCM();
    
    // Generate schedule based on algorithm
    const schedule = currentAlgorithm === 'EDF' ? 
        generateEDFSchedule(arrivalTime, lcmPeriod) : 
        generateRMASchedule(arrivalTime, lcmPeriod);
    
    // Display Gantt chart
    displayGanttChart(schedule, arrivalTime);
}

// Generate EDF schedule
function generateEDFSchedule(arrivalTime, timelineLength) {
    const schedule = [];
    const currentDeadlines = {};
    const remainingDurations = {};
    
    // Initialize process states
    processes.forEach(process => {
        currentDeadlines[process.name] = arrivalTime + process.deadline;
        remainingDurations[process.name] = process.duration;
    });
    
    for (let time = arrivalTime; time < arrivalTime + timelineLength; time++) {
        // Check for new periods
        processes.forEach(process => {
            if ((time - arrivalTime) % process.period === 0) {
                currentDeadlines[process.name] = time + process.deadline;
                remainingDurations[process.name] = process.duration;
            }
        });
        
        // Find process with earliest deadline that has remaining work
        let selectedProcess = null;
        let earliestDeadline = Infinity;
        
        for (const name in remainingDurations) {
            if (remainingDurations[name] > 0 && currentDeadlines[name] < earliestDeadline) {
                earliestDeadline = currentDeadlines[name];
                selectedProcess = processes.find(p => p.name === name);
            }
        }
        
        if (selectedProcess) {
            schedule.push({
                time,
                process: selectedProcess
            });
            
            remainingDurations[selectedProcess.name]--;
        } else {
            schedule.push({ time, process: null });
        }
    }
    
    return schedule;
}

// Generate RMA schedule (Rate Monotonic)
function generateRMASchedule(arrivalTime, timelineLength) {
    const schedule = [];
    const remainingDurations = {};
    const nextReleaseTimes = {};
    
    // Initialize process states
    processes.forEach(process => {
        remainingDurations[process.name] = process.duration;
        nextReleaseTimes[process.name] = arrivalTime;
    });
    
    // Sort processes by period (Rate Monotonic priority assignment)
    const sortedProcesses = [...processes].sort((a, b) => a.period - b.period);
    
    for (let time = arrivalTime; time < arrivalTime + timelineLength; time++) {
        // Check for new periods
        sortedProcesses.forEach(process => {
            if (time >= nextReleaseTimes[process.name]) {
                remainingDurations[process.name] = process.duration;
                nextReleaseTimes[process.name] = time + process.period;
            }
        });
        
        // Find highest priority process with remaining work
        let selectedProcess = null;
        
        for (const process of sortedProcesses) {
            if (remainingDurations[process.name] > 0) {
                selectedProcess = process;
                break;
            }
        }
        
        if (selectedProcess) {
            schedule.push({
                time,
                process: selectedProcess
            });
            
            remainingDurations[selectedProcess.name]--;
        } else {
            schedule.push({ time, process: null });
        }
    }
    
    return schedule;
}

function displayGanttChart(schedule, arrivalTime) {
    ganttContainer.innerHTML = `
        <h2>${currentAlgorithm} Gantt Chart</h2>
        <div class="gantt-chart"></div>
        <div class="gantt-time-scale"></div>
        <button id="backBtn" class="back-btn">← Back</button>
    `;
    
    const ganttChart = document.querySelector('.gantt-chart');
    const timeScale = document.querySelector('.gantt-time-scale');
    
    // Group schedule into continuous blocks
    const blocks = [];
    let currentBlock = null;
    
    for (const item of schedule) {
        if (item.process) {
            if (!currentBlock || currentBlock.process.name !== item.process.name) {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = {
                    process: item.process,
                    startTime: item.time,
                    endTime: item.time + 1
                };
            } else {
                currentBlock.endTime = item.time + 1;
            }
        } else {
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
            // Add idle block
            blocks.push({
                process: null,
                startTime: item.time,
                endTime: item.time + 1
            });
        }
    }
    if (currentBlock) blocks.push(currentBlock);
    
    // Calculate total time and pixel per time unit
    const totalTime = schedule.length;
    const pixelPerTime = Math.max(5, 800 / totalTime);
    ganttChart.style.width = `${totalTime * pixelPerTime}px`;
    timeScale.style.width = `${totalTime * pixelPerTime}px`;
    
    // Create Gantt blocks and time ticks
    let lastTime = arrivalTime;
    blocks.forEach((block, index) => {
        const blockWidth = (block.endTime - block.startTime) * pixelPerTime;
        
        const blockElement = document.createElement('div');
        blockElement.className = block.process ? 'gantt-block' : 'idle-block';
        if (block.process) {
            blockElement.style.backgroundColor = block.process.color;
            blockElement.textContent = block.process.name;
        }
        blockElement.style.width = `${blockWidth}px`;
        ganttChart.appendChild(blockElement);
        
        // Add time tick at the start of each block (except first if it starts at 0)
        if (index === 0 && block.startTime === arrivalTime) {
            // Add initial time tick
            const initialTimeTick = document.createElement('div');
            initialTimeTick.className = 'gantt-time-tick';
            initialTimeTick.style.left = '0px';
            initialTimeTick.textContent = arrivalTime;
            timeScale.appendChild(initialTimeTick);
        }
        
        // Add time tick at the end of each block
        const timeTick = document.createElement('div');
        timeTick.className = 'gantt-time-tick';
        timeTick.style.left = `${(block.endTime - arrivalTime) * pixelPerTime}px`;
        timeTick.textContent = block.endTime;
        timeScale.appendChild(timeTick);
        
        lastTime = block.endTime;
    });
    
    // Add back button functionality
    document.getElementById('backBtn').addEventListener('click', () => {
        ganttContainer.innerHTML = '';
    });
}

// Add back to selection button functionality
document.getElementById('backToSelectionBtn').addEventListener('click', () => {
    parameterInputSection.classList.remove('active');
    processSelectionSection.classList.add('active');
    ganttContainer.innerHTML = '';
});

