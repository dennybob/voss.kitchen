/* =========================================
   VOSS KITCHEN
   Application JavaScript
   ========================================= */


/* -----------------------------------------
   Supabase Configuration
   -----------------------------------------

   Project URL and Publishable Key
   from Supabase Dashboard > Settings > API
   ----------------------------------------- */

const SUPABASE_URL = "https://stozhfrjxmrsteppwbvy.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dWw9OpeLA4Fg8zzOF6A8qg_qKTddtZc";


/* Create the Supabase client */

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* -----------------------------------------
   Application Initialization
   ----------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    setCurrentYear();

    // Recipe loading will be enabled once
    // we have recipes in the database.
    //
    // loadRecipes();

});


/* -----------------------------------------
   Footer Year
   ----------------------------------------- */

function setCurrentYear() {

    const yearElement =
        document.getElementById("current-year");

    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
    }
}


/* -----------------------------------------
   Load Recipes
   -----------------------------------------

   This function will retrieve publicly
   available recipes from Supabase.

   RLS currently allows anyone to SELECT
   recipes, so this will work for both
   anonymous visitors and logged-in users.
   ----------------------------------------- */

async function loadRecipes() {

    const { data, error } = await supabaseClient
        .from("recipes")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(
            "Error loading recipes:",
            error
        );

        return;
    }

    displayRecipes(data);
}


/* -----------------------------------------
   Display Recipes
   ----------------------------------------- */

function displayRecipes(recipes) {

    const grid =
        document.getElementById("recipe-grid");

    const count =
        document.getElementById("recipe-count");

    if (!grid) {
        return;
    }


    /* Update recipe count */

    if (count) {

        const number = recipes.length;

        count.textContent =
            `${number} ${number === 1 ? "recipe" : "recipes"}`;
    }


    /* No recipes */

    if (recipes.length === 0) {

        grid.innerHTML = `
            <div class="empty-state">

                <div class="empty-state-icon">⌂</div>

                <h3>The kitchen is warming up.</h3>

                <p>
                    Recipes will appear here once we've
                    added them to the cookbook.
                </p>

            </div>
        `;

        return;
    }


    /* Create recipe cards */

    grid.innerHTML = recipes.map(recipe => {

        const category =
            recipe.category || "Recipe";

        const description =
            recipe.description || "";

        return `
            <article class="recipe-card">

                ${
                    recipe.image_url
                        ? `
                            <div class="recipe-card-image">
                                <img
                                    src="${escapeHtml(recipe.image_url)}"
                                    alt="${escapeHtml(recipe.title)}"
                                    loading="lazy"
                                >
                            </div>
                          `
                        : ""
                }

                <div class="recipe-card-content">

                    <div class="recipe-card-category">
                        ${escapeHtml(category)}
                    </div>

                    <h3 class="recipe-card-title">
                        ${escapeHtml(recipe.title)}
                    </h3>

                    ${
                        description
                            ? `
                                <p class="recipe-card-description">
                                    ${escapeHtml(description)}
                                </p>
                              `
                            : ""
                    }

                </div>

            </article>
        `;

    }).join("");
}


/* -----------------------------------------
   Basic HTML Escaping
   -----------------------------------------

   Recipe data comes from the database.
   Never insert database content directly
   into innerHTML without escaping it.
   ----------------------------------------- */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
