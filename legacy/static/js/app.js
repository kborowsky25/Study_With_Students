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


// for xp to flow hehe




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
