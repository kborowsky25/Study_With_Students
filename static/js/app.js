// to expand and collapse sidebar for student

document.addEventListener("DOMContentLoaded", function () {

    function expand() {

    let btn = document.getElementById("toggle_btn")  
    let sidebar_collapsed = document.querySelector(".hub_sidebar_student_collapsed")
    let sidebar_expanded = document.querySelector(".hub_sidebar_student")

    sidebar_collapsed.classList.toggle("hide")
    sidebar_expanded.classList.toggle("hide")

    change_event()
    }

    function change_event() {
        if (!document.querySelector(".hub_sidebar_student_collapsed").classList.contains('hide')) {
            // We are in student mode, attach listener to the student button
            document.getElementById('toggle_btn_collapsed').addEventListener('click', expand);
        } else {
            // We are in tutor mode, attach listener to the tutor button
            document.getElementById('toggle_btn_expanded').addEventListener('click', expand);
        }
    }

    // Initial event listener attachment
    change_event();
})



// to expand and collapse sidebar for tutor

document.addEventListener("DOMContentLoaded", function () {

    function expand() {

    let btn = document.getElementById("toggle_btn")  
    let sidebar_collapsed = document.querySelector(".hub_sidebar_tutor_collapsed")
    let sidebar_expanded = document.querySelector(".hub_sidebar_tutor")

    sidebar_collapsed.classList.toggle("hide")
    sidebar_expanded.classList.toggle("hide")

    change_event()
    }

    function change_event() {
        if (!document.querySelector(".hub_sidebar_tutor_collapsed").classList.contains('hide')) {
            // We are in student mode, attach listener to the student button
            document.getElementById('toggle_btn_collapsed').addEventListener('click', expand);
        } else {
            // We are in tutor mode, attach listener to the tutor button
            document.getElementById('toggle_btn_expanded').addEventListener('click', expand);
        }
    }

    // Initial event listener attachment
    change_event();
})




// for filtering using AJAX in Find Tutor.html 

document.getElementById('filter_form_id').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    // Get selected filter values
    const university = document.getElementById('uni').value;
    const subject = document.getElementById('subject').value;

    // Send the data via AJAX
    fetch("/find-tutor-ajax", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': '{{ csrf_token() }}' // For CSRF protection if enabled in Flask
        },
        body: JSON.stringify({ university: university, subject: subject })
    })
    .then(response => response.json())
    .then(data => {
        const resultsContainer = document.getElementById('tutorResults');
        resultsContainer.innerHTML = ''; // Clear current results

        if (data.tutors.length > 0) {
            data.tutors.forEach(tutor => {
                const tutorCard = `
                    <div class="tutor_card">
                        <p><strong>Name:</strong> ${tutor[1]}</p>
                        <p><strong>Age:</strong> ${tutor[5]}</p>
                        <p><strong>Uni:</strong> ${tutor[6]}</p>
                        <p><strong>Course:</strong> ${tutor[7]}</p>
                        <p><strong>About me:</strong> ${tutor[8]}</p>
                        <p><strong>Subjects:</strong> ${tutor[9]}</p>
                        <p><strong>Availability:</strong> ${tutor[10]}</p>
                    </div>
                    <hr>
                `;
                resultsContainer.insertAdjacentHTML('beforeend', tutorCard);
            });
        } else {
            resultsContainer.innerHTML = '<p>No tutors available at the moment.</p>';
        }
    })
    .catch(error => console.error('Error:', error));
});




































































// to switch between student and tutor mode javascript way


// document.addEventListener('DOMContentLoaded', function () {
//     // Function to handle switching between modes

//     function getQueryParameter(name) {
//         let urlParams = new URLSearchParams(window.location.search);
//         return urlParams.get(name);
//     }
    
//     window.addEventListener('load', function() {
//         var tutorMode = getQueryParameter('tutor_mode');
    
//             // Toggle visibility of student and tutor modes
//         if (tutorMode === 'true') {
//             let studentNavbar = document.getElementById('navbar_student');
//             let tutorNavbar = document.getElementById('navbar_tutor');
//             let studentHub = document.getElementById('div_hub_student');
//             let tutorHub = document.getElementById('div_hub_tutor');
    
//             studentNavbar.classList.toggle('hide'); //if there, will take it off...
//             tutorNavbar.classList.toggle('hide');
//             studentHub.classList.toggle('hide');
//             tutorHub.classList.toggle('hide');

//             attachEventListeners();
//         } 
//     });

//     function switchMode() {
//         let studentNavbar = document.getElementById('navbar_student');
//         let tutorNavbar = document.getElementById('navbar_tutor');
//         let studentHub = document.getElementById('div_hub_student');
//         let tutorHub = document.getElementById('div_hub_tutor');

//         // Toggle visibility of student and tutor modes
//         studentNavbar.classList.toggle('hide'); //if there, will take it off...
//         tutorNavbar.classList.toggle('hide');
//         studentHub.classList.toggle('hide');
//         tutorHub.classList.toggle('hide');

//         attachEventListeners();
//     }

//     // Function to attach event listeners based on the current mode
//     function attachEventListeners() {
//         if (!document.getElementById('navbar_student').classList.contains('hide')) {
//             // We are in student mode, attach listener to the student button
//             document.getElementById('switch_button_student').addEventListener('click', switchMode);
//         } else {
//             // We are in tutor mode, attach listener to the tutor button
//             document.getElementById('switch_button_tutor').addEventListener('click', switchMode);
//         }
//     }

//     // Initial event listener attachment
//     attachEventListeners();
// });
