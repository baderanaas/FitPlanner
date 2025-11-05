import os
import math
import requests
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SPOONACULAR_API_KEY = os.getenv("SPOON_API_KEY")
USDA_API_KEY = os.getenv("FOOD_API_KEY")


def _get_meal_prep(diet: str = None, allergies: list[str] = None, calories: int = None):
    """
    Generate a meal plan for the day based on dietary preferences, allergies, and target calories.

    Args:
        diet (str): Optional dietary restriction, e.g. "keto", "vegan", "vegetarian", "paleo", etc.
        allergies (list[str]): Optional list of ingredients to exclude (e.g. ["peanut", "shellfish"]).
        calories (int): Optional target calorie intake for the entire day.

    Returns:
        A JSON object with a full-day meal plan including breakfast, lunch, dinner and nutritional breakdown.
    """
    logger.info(f"🍽️  Tool called: _get_meal_prep | diet={diet}, allergies={allergies}, calories={calories}")

    url = "https://api.spoonacular.com/mealplanner/generate"
    params = {"timeFrame": "day", "apiKey": SPOONACULAR_API_KEY}
    if diet:
        params["diet"] = diet
    if calories:
        params["targetCalories"] = calories
    if allergies:
        params["exclude"] = ",".join(allergies)

    response = requests.get(url, params=params)
    return response.json()


def _get_nutrition_info(food: str):
    """
    Retrieve detailed nutrition facts for a specific food item using USDA FoodData Central.

    Args:
        food (str): Name of the food to search for (e.g. "banana", "boiled egg", "almonds").

    Returns:
        A structured nutritional report including calories, protein, fat, carbs, vitamins, and more.
    """
    logger.info(f"🥗 Tool called: _get_nutrition_info | food={food}")

    search_url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    search_params = {"query": food, "api_key": USDA_API_KEY}
    search_response = requests.get(search_url, params=search_params).json()
    if "foods" not in search_response or not search_response["foods"]:
        return {"error": "Food not found"}

    fdc_id = search_response["foods"][0]["fdcId"]
    detail_url = f"https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"
    detail_params = {"api_key": USDA_API_KEY}
    detail_response = requests.get(detail_url, params=detail_params)
    return detail_response.json()


def _bmi_calculator(weight: float, height: float):
    """
    Calculate Body Mass Index (BMI) using either metric or imperial units.
    Make sure to convert weight to kg and cm.

    Args:
        weight (float): Weight in kilograms (metric)
        height (float): Height in centimeters (metric)

    Returns:
        The calculated BMI rounded to two decimal places.
    """
    logger.info(f"⚖️  Tool called: _bmi_calculator | weight={weight}kg, height={height}cm")
    weight = float(weight)
    height = float(height)

    bmi = weight / (height / 100) ** 2
    return str({"bmi": round(bmi, 2)})


def _get_bodyfat_percentage(
    gender: str, waist: float, neck: float, height: float, hip: float = None
):
    """
    Estimate body fat percentage using the US Navy formula based on circumference measurements.
    make sure to convert all measurements to centimeters.

    Args:
        gender (str): "male" or "female".
        waist (float): Waist circumference in centimeters.
        neck (float): Neck circumference in centimeters.
        height (float): Height in centimeters.
        hip (float): Required only for females – hip circumference in centimeters.

    Returns:
        Estimated body fat percentage.
    """
    logger.info(f"📏 Tool called: _get_bodyfat_percentage | gender={gender}, waist={waist}cm, neck={neck}cm, height={height}cm, hip={hip}cm")
    waist = float(waist)
    neck = float(neck)
    height = float(height)
    hip = float(hip) if hip is not None else None
    if gender == "male":
        body_fat = (
            86.010 * math.log10(waist - neck) - 70.041 * math.log10(height) + 36.76
        )
    else:
        if hip is None:
            return {"error": "Hip required for females."}
        body_fat = (
            163.205 * math.log10(waist + hip - neck)
            - 97.684 * math.log10(height)
            - 78.387
        )
    return f"body_fat_percent: {round(body_fat, 2)}"


def _get_ideal_weight(height: float, gender: str):
    """
    Calculate the ideal body weight based on gender and height using the Devine formula.
    convert the height to inches.

    Args:
        height (float): Height in centimeters.
        gender (str): "male" or "female".

    Returns:
        Ideal weight in kilograms for the given height and gender. (converted to kg)
    """
    logger.info(f"🎯 Tool called: _get_ideal_weight | height={height}cm, gender={gender}")
    try:
        if gender.lower() == "male":
            ideal_weight = 50 + 2.3 * (height - 60)
        elif gender.lower() == "female":
            ideal_weight = 45.5 + 2.3 * (height - 60)
        else:
            return "Invalid gender specified. Please use 'male' or 'female'."

        return f"Your ideal weight is approximately {round(ideal_weight, 1)} kg."

    except ValueError:
        return (
            f"Error: Invalid height value '{height}'. Please provide a numeric value."
        )
    except Exception as e:
        return f"Error calculating ideal weight: {str(e)}"


def _get_macro_calculator(
    age: int, gender: str, height: float, weight: float, activity_level: int, goal: str
):
    """
    Calculate Total Daily Energy Expenditure (TDEE) and daily macronutrient distribution.
    Convert height to cm and weight to kg.

    Args:
        age (int): Age of the user in years.
        gender (str): "male" or "female".
        height (float): Height in centimeters.
        weight (float): Weight in kilograms.
        activity_level (int): Physical activity level from 1 (sedentary) to 7 (very active).
        goal (str): Calorie goal — one of ["maintain", "mildlose", "weightlose", "extremelose", "mildgain", "weightgain", "extremegain"].

    Returns:
        Daily calorie target and macro breakdowns for multiple diet styles (balanced, lowfat, etc.).
    """
    logger.info(f"💪 Tool called: _get_macro_calculator | age={age}, gender={gender}, height={height}cm, weight={weight}kg, activity_level={activity_level}, goal={goal}")
    if gender == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    activity_multipliers = {
        1: 1.0,
        2: 1.2,
        3: 1.375,
        4: 1.465,
        5: 1.55,
        6: 1.725,
        7: 1.9,
    }
    goal_adjustments = {
        "maintain": 1.0,
        "mildlose": 0.90,
        "weightlose": 0.80,
        "extremelose": 0.70,
        "mildgain": 1.10,
        "weightgain": 1.20,
        "extremegain": 1.30,
    }

    tdee = bmr * activity_multipliers.get(activity_level, 1.2)
    target_calories = tdee * goal_adjustments.get(goal, 1.0)

    macro_profiles = {
        "balanced": {"carbs": 0.50, "protein": 0.20, "fat": 0.30},
        "lowfat": {"carbs": 0.60, "protein": 0.25, "fat": 0.15},
        "lowcarbs": {"carbs": 0.20, "protein": 0.40, "fat": 0.40},
        "highprotein": {"carbs": 0.30, "protein": 0.40, "fat": 0.30},
    }

    def calculate_macros(ratio):
        return {
            "carbs": round((target_calories * ratio["carbs"]) / 4),
            "protein": round((target_calories * ratio["protein"]) / 4),
            "fat": round((target_calories * ratio["fat"]) / 9),
        }

    return str(
        {
            "calories": round(target_calories),
            "balanced": calculate_macros(macro_profiles["balanced"]),
            "lowfat": calculate_macros(macro_profiles["lowfat"]),
            "lowcarbs": calculate_macros(macro_profiles["lowcarbs"]),
            "highprotein": calculate_macros(macro_profiles["highprotein"]),
        }
    )
