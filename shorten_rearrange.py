#!/usr/bin/env python3
"""Shorten all rearrange sentences to 4-5 words."""

FILEPATH = "/home/user/English-Arena/english-classroom-game.jsx"

with open(FILEPATH) as f:
    src = f.read()

# (old words/answer, new words/answer)
# Keeping grammar points clear but very short
REWRITES = [
  # travel_holidays
  (
    'words:["She","packed","her","bags","the","night","before"],answer:"She packed her bags the night before"',
    'words:["She","packed","her","bags","early"],answer:"She packed her bags early"'
  ),
  # work_office
  (
    'words:["she","sent","the","report","by","Friday"],answer:"she sent the report by Friday"',
    'words:["she","sent","the","report","early"],answer:"she sent the report early"'
  ),
  # cooking_recipes
  (
    'words:["add","the","eggs","one","by","one"],answer:"add the eggs one by one"',
    'words:["add","the","eggs","slowly"],answer:"add the eggs slowly"'
  ),
  # health_wellbeing
  (
    'words:["sleep","is","essential","for","good","health"],answer:"sleep is essential for good health"',
    'words:["sleep","is","very","important"],answer:"sleep is very important"'
  ),
  # technology_gadgets
  (
    'words:["you","should","back","up","your","files"],answer:"you should back up your files"',
    'words:["back","up","your","files"],answer:"back up your files"'
  ),
  # the_environment
  (
    'words:["we","should","use","less","plastic"],answer:"we should use less plastic"',
    'words:["use","less","plastic","today"],answer:"use less plastic today"'
  ),
  # sports_fitness
  (
    'words:["she","trains","every","day","after","work"],answer:"she trains every day after work"',
    'words:["she","trains","every","day"],answer:"she trains every day"'
  ),
  # family_life
  (
    'words:["my","parents","got","married","in","a","small","church"],answer:"my parents got married in a small church"',
    'words:["my","parents","got","married","young"],answer:"my parents got married young"'
  ),
  # education_studying
  (
    'words:["students","must","hand","in","work","on","time"],answer:"students must hand in work on time"',
    'words:["hand","in","your","work","today"],answer:"hand in your work today"'
  ),
  # money_banking
  (
    'words:["she","opened","a","savings","account","last","year"],answer:"she opened a savings account last year"',
    'words:["she","opened","a","bank","account"],answer:"she opened a bank account"'
  ),
  # shopping_fashion
  (
    'words:["she","always","checks","the","sale","section","first"],answer:"she always checks the sale section first"',
    'words:["she","always","checks","the","sales"],answer:"she always checks the sales"'
  ),
  # music
  (
    'words:["he","taught","himself","to","play","guitar"],answer:"he taught himself to play guitar"',
    'words:["he","plays","guitar","very","well"],answer:"he plays guitar very well"'
  ),
  # social_media_internet
  (
    'words:["she","spends","too","much","time","on","her","phone"],answer:"she spends too much time on her phone"',
    'words:["she","is","always","on","her","phone"],answer:"she is always on her phone"'
  ),
  # ambitions_goals
  (
    'words:["she","is","determined","to","make","a","difference"],answer:"she is determined to make a difference"',
    'words:["she","never","gives","up"],answer:"she never gives up"'
  ),
  # culture_traditions
  (
    'words:["learning","about","other","cultures","helps","us"],answer:"learning about other cultures helps us"',
    'words:["respect","other","people\'s","traditions"],answer:"respect other people\'s traditions"'
  ),
  # films_tv
  (
    'words:["the","director","has","been","making","films","for","years"],answer:"the director has been making films for years"',
    'words:["the","film","was","very","long"],answer:"the film was very long"'
  ),
  # books_reading
  (
    'words:["she","always","reads","before","bed"],answer:"she always reads before bed"',
    'words:["she","reads","every","single","day"],answer:"she reads every single day"'
  ),
  # home_housing
  (
    'words:["we","moved","to","a","bigger","house","last","year"],answer:"we moved to a bigger house last year"',
    'words:["we","moved","house","last","year"],answer:"we moved house last year"'
  ),
  # food_restaurants
  (
    'words:["she","asked","for","some","extra","bread"],answer:"she asked for some extra bread"',
    'words:["she","asked","for","the","bill"],answer:"she asked for the bill"'
  ),
  # cities_travel
  (
    'words:["the","city","has","changed","a","lot","recently"],answer:"the city has changed a lot recently"',
    'words:["the","city","has","changed","completely"],answer:"the city has changed completely"'
  ),
  # science_discovery
  (
    'words:["the","experiment","was","repeated","three","times"],answer:"the experiment was repeated three times"',
    'words:["the","test","was","repeated","twice"],answer:"the test was repeated twice"'
  ),
  # friendship
  (
    'words:["a","true","friend","always","tells","you","the","truth"],answer:"a true friend always tells you the truth"',
    'words:["friends","should","trust","each","other"],answer:"friends should trust each other"'
  ),
  # celebrations_parties
  (
    'words:["everyone","agreed","it","was","the","best","party"],answer:"everyone agreed it was the best party"',
    'words:["it","was","a","great","party"],answer:"it was a great party"'
  ),
  # emotions_feelings
  (
    'words:["she","was","relieved","to","hear","the","good","news"],answer:"she was relieved to hear the good news"',
    'words:["she","felt","very","relieved"],answer:"she felt very relieved"'
  ),
  # language_communication
  (
    'words:["learning","a","language","takes","time"],answer:"learning a language takes time"',
    'words:["practise","speaking","every","day"],answer:"practise speaking every day"'
  ),
  # news_current_affairs
  (
    'words:["the","new","law","was","announced","yesterday"],answer:"the new law was announced yesterday"',
    'words:["the","news","was","very","surprising"],answer:"the news was very surprising"'
  ),
  # hobbies_free_time
  (
    'words:["she","takes","photographs","every","weekend"],answer:"she takes photographs every weekend"',
    'words:["she","loves","taking","photographs"],answer:"she loves taking photographs"'
  ),
  # nature_animals
  (
    'words:["many","species","are","at","risk","of","extinction"],answer:"many species are at risk of extinction"',
    'words:["many","animals","are","endangered"],answer:"many animals are endangered"'
  ),
  # jobs_interviews
  (
    'words:["she","impressed","the","interviewers","with","her","confidence"],answer:"she impressed the interviewers with her confidence"',
    'words:["she","got","the","job","offer"],answer:"she got the job offer"'
  ),
  # past_memories
  (
    'words:["she","found","old","photos","while","sorting","her","things"],answer:"she found old photos while sorting her things"',
    'words:["she","found","some","old","photos"],answer:"she found some old photos"'
  ),
]

print("Shortening rearrange sentences...")
for i, (old, new) in enumerate(REWRITES):
    if old in src:
        src = src.replace(old, new)
        print(f"  ✓ #{i+1}")
    else:
        print(f"  ✗ #{i+1} NOT FOUND: {old[:60]}")

with open(FILEPATH, "w") as f:
    f.write(src)

print("Done!")
