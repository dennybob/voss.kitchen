let currentUser = null;
let currentProfile = null;

document.addEventListener("DOMContentLoaded", async () => {
  setCurrentYear();

  currentUser = await getCurrentUser();
  currentProfile = await getCurrentProfile();

  // Must be logged in.
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  // Must have an approved profile.
  if (!currentProfile || !currentProfile.approved) {
    window.location.href = "index.html";
    return;
  }

  initializeRecipeForm();
});


function initializeRecipeForm() {
  const form = document.getElementById("recipe-form");
  const addIngredientButton = document.getElementById("add-ingredient");
  const imageInput = document.getElementById("recipe-image");

  if (!form) return;

  // Start with one empty ingredient.
  addIngredient();

  addIngredientButton.addEventListener("click", () => {
  addIngredient();
});

  imageInput.addEventListener("change", handleImagePreview);

  form.addEventListener("submit", handleRecipeSubmit);
}


function addIngredient(value = "") {
  const list = document.getElementById("ingredients-list");

  const row = document.createElement("div");
  row.className = "ingredient-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ingredient-input";
  input.placeholder = "e.g. 2 cups all-purpose flour";
  input.value = value;
  input.maxLength = 500;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-ingredient";
  removeButton.textContent = "−";
  removeButton.setAttribute("aria-label", "Remove ingredient");

  removeButton.addEventListener("click", () => {
    row.remove();

    // Always keep at least one ingredient field.
    const remaining = list.querySelectorAll(".ingredient-row");

    if (remaining.length === 0) {
      addIngredient();
    }
  });

  row.appendChild(input);
  row.appendChild(removeButton);

  list.appendChild(row);

  input.focus();
}


function handleImagePreview(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("image-preview");
  const container = document.getElementById("image-preview-container");

  if (!file) {
    preview.removeAttribute("src");
    container.classList.remove("visible");
    return;
  }

  if (!file.type.startsWith("image/")) {
    showRecipeFormMessage("Please select an image file.", "error");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    preview.src = reader.result;
    container.classList.add("visible");
  };

  reader.readAsDataURL(file);
}


async function handleRecipeSubmit(event) {
  event.preventDefault();

  clearRecipeFormMessage();

  const saveButton = document.getElementById("save-recipe");

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    const formData = collectRecipeFormData();

    validateRecipeFormData(formData);

    let imageUrl = null;

    const imageFile = document.getElementById("recipe-image").files[0];

    if (imageFile) {
      imageUrl = await uploadRecipeImage(imageFile);
    }

    const { data, error } = await supabaseClient
      .from("recipes")
      .insert({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        servings: formData.servings,
        prep_time: formData.prep_time,
        cook_time: formData.cook_time,
        ingredients: formData.ingredients,
        instructions: formData.instructions,
        notes: formData.notes,
        image_url: imageUrl,
        created_by: currentUser.id
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving recipe:", error);
      throw new Error("Unable to save the recipe.");
    }

    window.location.href = `recipe.html?id=${encodeURIComponent(data.id)}`;

  } catch (error) {
    console.error("Recipe save error:", error);

    showRecipeFormMessage(
      error.message || "Unable to save the recipe.",
      "error"
    );

    saveButton.disabled = false;
    saveButton.textContent = "Save Recipe";
  }
}


function collectRecipeFormData() {
  const getValue = (id) => {
    const element = document.getElementById(id);
    return element.value.trim();
  };

  const numberOrNull = (id) => {
    const value = getValue(id);

    if (value === "") {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };

  const ingredientInputs = document.querySelectorAll(".ingredient-input");

  const ingredients = Array.from(ingredientInputs)
    .map(input => input.value.trim())
    .filter(value => value !== "");

  return {
    title: getValue("recipe-title"),
    description: getValue("recipe-description") || null,
    category: getValue("recipe-category") || null,
    servings: numberOrNull("recipe-servings"),
    prep_time: numberOrNull("recipe-prep-time"),
    cook_time: numberOrNull("recipe-cook-time"),
    ingredients: ingredients,
    instructions: getValue("recipe-instructions"),
    notes: getValue("recipe-notes") || null
  };
}


function validateRecipeFormData(data) {
  if (!data.title) {
    throw new Error("Please enter a recipe title.");
  }

  if (!data.instructions) {
    throw new Error("Please enter the cooking instructions.");
  }

  if (data.ingredients.length === 0) {
    throw new Error("Please add at least one ingredient.");
  }

  if (
    data.servings !== null &&
    (!Number.isInteger(data.servings) || data.servings < 1)
  ) {
    throw new Error("Servings must be a whole number greater than zero.");
  }

  if (
    data.prep_time !== null &&
    (!Number.isInteger(data.prep_time) || data.prep_time < 0)
  ) {
    throw new Error("Prep time must be zero or greater.");
  }

  if (
    data.cook_time !== null &&
    (!Number.isInteger(data.cook_time) || data.cook_time < 0)
  ) {
    throw new Error("Cook time must be zero or greater.");
  }
}


async function uploadRecipeImage(file) {
  const fileExtension = getImageExtension(file);
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;

  const filePath = fileName;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("recipe-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    console.error("Image upload error:", uploadError);
    throw new Error("Unable to upload the recipe image.");
  }

  const {
    data: publicUrlData
  } = supabaseClient
    .storage
    .from("recipe-images")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}


function getImageExtension(file) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      throw new Error("Please use a JPG, PNG, or WebP image.");
  }
}


function showRecipeFormMessage(message, type = "") {
  const element = document.getElementById("recipe-form-message");

  if (!element) return;

  element.textContent = message;
  element.className = `auth-message ${type}`;
}


function clearRecipeFormMessage() {
  const element = document.getElementById("recipe-form-message");

  if (!element) return;

  element.textContent = "";
  element.className = "auth-message";
}
