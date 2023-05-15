document.addEventListener('DOMContentLoaded', () => {
    const weekInput = document.getElementById('week');
    const monthNameDisplay = document.getElementById('month-name');
    const addRowBtn = document.getElementById('add-row');
    const deleteRowBtn = document.getElementById('delete-row');
    const timesheet = document.getElementById('timesheet');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dropdownOptions = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    const saveDraftBtn = document.getElementById('save-draft');
    const submitBtn = document.getElementById('submit');

    $(function () {
        $(".modal-content").resizable({
            handles: "n, e, s, w, ne, se, sw, nw"
        });

        $(".modal-dialog").draggable({
            handle: ".modal-header"
        });
    });

    function getDateOfISOWeek(w, y) {
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4) {
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        } else {
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        }
        return ISOweekStart;
    }

    weekInput.addEventListener('change', () => {
        const [year, week] = weekInput.value.split('-W');
        const firstDay = getDateOfISOWeek(parseInt(week), parseInt(year));
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        monthNameDisplay.textContent = monthNames[firstDay.getMonth()];

        const headerCells = timesheet.querySelectorAll('thead th[data-day]');
        headerCells.forEach((cell, i) => {
            const dayDate = new Date(firstDay);
            dayDate.setDate(dayDate.getDate() + i);
            const formattedDate = `${dayDate.getDate()} ${monthNames[dayDate.getMonth()]}`;
            cell.innerHTML = `${days[i]}<br>${formattedDate}`;
        });
    });

    function openDetailModal(event) {
        const targetInput = event.currentTarget;
        $("#detailModal").modal("show");
        $("#detailModal").draggable({ handle: ".modal-header" });
        $("#detailModal").resizable({ handles: "n, e, s, w, ne, nw, se, sw" });

        const existingDetails = targetInput.getAttribute("data-details");
        if (existingDetails) {
            const detailsObj = JSON.parse(existingDetails);
            $("#tag").val(detailsObj.tag);
            $("#description").val(detailsObj.description);
        } else {
            $("#tag").val("");
            $("#description").val("");
        }

        $("#saveDetails").off("click").on("click", function () {
            const tag = $("#tag").val();
            const description = $("#description").val();
            const detailsObj = { tag, description };
            targetInput.setAttribute("data-details", JSON.stringify(detailsObj));
            $("#detailModal").modal("hide");
        });
    }
    function setCurrentWeek() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const firstDayOfYear = new Date(currentYear, 0, 1);
        const pastDaysOfYear = (currentDate - firstDayOfYear) / 86400000;
        const currentWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        const weekString = currentWeek < 10 ? `0${currentWeek}` : `${currentWeek}`;
        weekInput.value = `${currentYear}-W${weekString}`;
    }
    
        addRowBtn.addEventListener('click', () => {
            const row = document.createElement('tr');
        
            const textInputElement = document.createElement('input');
            textInputElement.type = 'text';
            textInputElement.setAttribute('list', 'activity-options');
            textInputElement.addEventListener("dblclick", openDetailModal);
        
            const dataListElement = document.createElement('datalist');
            dataListElement.id = 'activity-options';
            dropdownOptions.forEach((optionText) => {
                const option = document.createElement('option');
                option.textContent = optionText;
                dataListElement.appendChild(option);
            });
        
            const activityWrapper = document.createElement('div');
            activityWrapper.appendChild(textInputElement);
            activityWrapper.appendChild(dataListElement);
        
            const activityCell = document.createElement('td');
            activityCell.appendChild(activityWrapper);
        
            row.appendChild(activityCell);
        
            row.innerHTML += `${days.map(() => '<td><input type="number" min="0" max="24" step="0.5"></td>').join('')}`;
            row.querySelectorAll('input[type="number"]').forEach((input) => {
                input.addEventListener('dblclick', openDetailModal);
            });
        
            const deleteButton = createDeleteButton();
            const deleteButtonCell = document.createElement('td');
            deleteButtonCell.appendChild(deleteButton);
            row.appendChild(deleteButtonCell);
        
            row.querySelectorAll('input[type="number"]').forEach((input) => {
                input.addEventListener('input', updateTotals);
            });
            timesheet.tBodies[0].appendChild(row);
            updateTotals();
        });
        
        deleteRowBtn.addEventListener('click', () => {
            const lastRow = timesheet.tBodies[0].lastElementChild;
            if (lastRow) {
                lastRow.remove();
                updateTotals();
            }
        });
        
        function updateTotals() {
            const footerCells = timesheet.querySelectorAll('tfoot td');
            const columnTotals = Array.from({ length: days.length }, () => 0);
        
            timesheet.tBodies[0].querySelectorAll('tr').forEach((row) => {
                row.querySelectorAll('input[type="number"]').forEach((input, col) => {
                    const value = parseFloat(input.value) || 0;
                    columnTotals[col] += value;
                });
            });
        
            footerCells.forEach((cell, i) => {
                cell.textContent = columnTotals[i].toFixed(2);
                cell.style.fontWeight = 'bold';
            });
        }
        
        function createDeleteButton() {
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = 'X';
            deleteButton.addEventListener('click', function () {
                const row = this.parentNode.parentNode;
                row.remove();
                updateTotals();
            });
            return deleteButton;
        }
        
        setCurrentWeek();
        addRowBtn.click();
    });        

    function collectTimesheetData() {
        const rows = Array.from(timesheet.tBodies[0].querySelectorAll('tr'));
        const timesheetData = rows.map((row) => {
            const activity = row.querySelector('input[type="text"]').value;
            const hours = Array.from(row.querySelectorAll('input[type="number"]')).map((input) => parseFloat(input.value) || 0);
            return { activity, hours };
        });
        return timesheetData;
    }
    async function sendTimesheetData(week, timesheetData) {
        const response = await fetch('/dashboard/submit-new-timesheet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ week, timesheetData }),
        });
        return response;
    }

    saveDraftBtn.addEventListener('click', async () => {
        const week = weekInput.value;
        const timesheetData = collectTimesheetData();
        console.log('Save as Draft clicked', { week, timesheetData });
    
        const response = await sendTimesheetData(week, timesheetData);
        if (response.ok) {
            console.log('Timesheet saved as draft successfully');
        } else {
            console.error('Error saving timesheet as draft');
        }
    });
    
    submitBtn.addEventListener('click', async () => {
        const week = weekInput.value;
        const timesheetData = collectTimesheetData();       
        console.log('Submit clicked', { week, timesheetData });
    
        const response = await sendTimesheetData(week, timesheetData);
        if (response.ok) {
            console.log('Timesheet submitted successfully');
        } else {
            console.error('Error submitting timesheet');
        }
    });
    
    
    