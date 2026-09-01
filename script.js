```javascript
document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       MOBILE MENU
    ========================= */

    const menuButton = document.getElementById("menuButton");
    const nav = document.getElementById("nav");

    if (menuButton && nav) {

        menuButton.addEventListener("click", () => {
            nav.classList.toggle("active");
        });


        // Закрываем меню после перехода по ссылке

        const navLinks = nav.querySelectorAll("a");

        navLinks.forEach(link => {

            link.addEventListener("click", () => {
                nav.classList.remove("active");
            });

        });

    }


    /* =========================
       SCROLL ANIMATION
    ========================= */

    const animatedElements = document.querySelectorAll(
        ".feature-card, .about-content, .about-visual, .cta"
    );


    const observer = new IntersectionObserver(
        (entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

                    observer.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.15
        }
    );


    animatedElements.forEach(element => {
        observer.observe(element);
    });


    /* =========================
       HEADER SCROLL EFFECT
    ========================= */

    const header = document.querySelector(".header");

    window.addEventListener("scroll", () => {

        if (window.scrollY > 30) {

            header.style.background =
                "rgba(8, 9, 12, 0.92)";

        } else {

            header.style.background =
                "rgba(8, 9, 12, 0.75)";

        }

    });


    /* =========================
       CURRENT YEAR
    ========================= */

    const yearElement = document.querySelector(".footer p");

    if (yearElement) {

        const currentYear = new Date().getFullYear();

        yearElement.textContent =
            `© ${currentYear} NAME. Все права защищены.`;

    }

});
```
