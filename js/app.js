const SUPABASE_URL = "https://stozhfrjxmrsteppwbvy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dWw9OpeLA4Fg8zzOF6A8qg_qKTddtZc";

const supabaseClient = window.supabase.createClient(
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
);

document.addEventListener("DOMContentLoaded", () => {


	setCurrentYear();

	loadRecipes();

	updateAuthNavigation();

	const searchInput =
		document.getElementById("recipe-search");

	if (searchInput) {
		searchInput.addEventListener(
			"input",
			handleSearch
		);
	}


});

let allRecipes = [];

function setCurrentYear() {


	const yearElement =
		document.getElementById("current-year");

	if (yearElement) {
		yearElement.textContent =
			new Date().getFullYear();
	}


}

async function loadRecipes() {


	const grid =
		document.getElementById("recipe-grid");

	if (grid) {
		grid.innerHTML = `
        <div class="empty-state">
            <h3>Loading recipes...</h3>
        </div>
    `;
	}

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

		displayLoadError();

		return;
	}

	allRecipes = data || [];

	displayRecipes(allRecipes);


}

function displayRecipes(recipes) {


	const grid =
		document.getElementById("recipe-grid");

	const count =
		document.getElementById("recipe-count");

	if (!grid) {
		return;
	}

	if (count) {

		const number =
			recipes.length;

		count.textContent =
			`${number} ${number === 1 ? "recipe" : "recipes"}`;

	}

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


	grid.innerHTML = recipes.map(recipe => {

		const category =
			recipe.category || "Recipe";

		const description =
			recipe.description || "";

		const imageHtml =
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
				: "";


		return `
        <a
            href="recipe.html?id=${encodeURIComponent(recipe.id)}"
            class="recipe-card-link"
        >

            <article class="recipe-card">

                ${imageHtml}

                <div class="recipe-card-content">

                    <div class="recipe-card-category">
                        ${escapeHtml(category)}
                    </div>

                    <h3 class="recipe-card-title">
                        ${escapeHtml(recipe.title)}
                    </h3>

                    ${description
				? `
                                <p class="recipe-card-description">
                                    ${escapeHtml(description)}
                                </p>
                              `
				: ""
			}

                    <span class="recipe-card-read-more">
                        View recipe →
                    </span>

                </div>

            </article>

        </a>
    `;

	}).join("");


}

function handleSearch(event) {


	const searchTerm =
		event.target.value
			.trim()
			.toLowerCase();

	if (!searchTerm) {

		displayRecipes(allRecipes);

		return;
	}

	const filteredRecipes =
		allRecipes.filter(recipe => {

			const title =
				recipe.title || "";

			const description =
				recipe.description || "";

			const category =
				recipe.category || "";

			return (
				title.toLowerCase().includes(searchTerm) ||
				description.toLowerCase().includes(searchTerm) ||
				category.toLowerCase().includes(searchTerm)
			);

		});

	displayRecipes(filteredRecipes);


}

function displayLoadError() {


	const grid =
		document.getElementById("recipe-grid");

	const count =
		document.getElementById("recipe-count");

	if (count) {
		count.textContent = "";
	}

	if (!grid) {
		return;
	}

	grid.innerHTML = `
    <div class="empty-state">
        <h3>Unable to load recipes.</h3>

        <p>
            Please try refreshing the page.
        </p>
    </div>
`;


}

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
