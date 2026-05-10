#!/usr/bin/env python3
"""
Update english-classroom-game.jsx:
1. Rewrite story_builder questions (3 short sentences with sequencing words)
2. Rewrite rearrange questions (shorter sentences)
3. Reduce multiple_choice from 4 options to 3
"""
import re

FILEPATH = "/home/user/English-Arena/english-classroom-game.jsx"

with open(FILEPATH, "r") as f:
    src = f.read()

# ── 1. STORY_BUILDER REPLACEMENTS ─────────────────────────────────────────────
# New 3-sentence story_builder questions (correctOrder scrambles the story)
# Format: (old_snippet, new_json_line)
# correctOrder: indices into sentences[] that form the correct sequence
# answer: correctOrder.join(",")

SB = [
  # travel_holidays
  (
    'sentences:["They finally checked in and collapsed on the hotel beds.","Their flight was delayed by three hours.","Sara and Tom left home at five in the morning.","After landing, they waited an hour for their luggage."],correctOrder:[2,1,3,0],answer:"2,1,3,0",explanation:"Left home → delay → waited for luggage → checked in."',
    'sentences:["Finally, they checked in and relaxed at the hotel.","First, they booked their flights and packed their bags.","Then, they took a taxi to the airport."],correctOrder:[1,2,0],answer:"1,2,0",explanation:"Book and pack → taxi → check in."'
  ),
  # work_office
  (
    'sentences:["He shook hands with the interviewer and thanked her.","David researched the company the night before.","She offered him the job two days later.","He answered questions about his experience confidently."],correctOrder:[1,3,0,2],answer:"1,3,0,2",explanation:"Preparation → answered questions → polite goodbye → job offer."',
    'sentences:["Then, he answered questions about his experience.","First, David prepared for the interview the night before.","Finally, the manager offered him the job."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Prepare → answer questions → get the job."'
  ),
  # cooking_recipes
  (
    'sentences:["She served it with fresh basil and parmesan.","Maria boiled a large pot of salted water.","She added the pasta and cooked it for ten minutes.","While waiting, she prepared the tomato sauce."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Boil water → prepare sauce → cook pasta → serve."',
    'sentences:["Finally, she served the pasta with fresh basil.","First, Maria boiled a large pot of salted water.","Then, she added the pasta and cooked it for ten minutes."],correctOrder:[1,2,0],answer:"1,2,0",explanation:"Boil water → cook pasta → serve."'
  ),
  # health_wellbeing
  (
    'sentences:["Now she feels more energetic and sleeps much better.","Anna decided to improve her lifestyle last January.","She also joined a yoga class and started meditating.","She began by cutting out sugary drinks and walking daily."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Decision → first changes → added more habits → result."',
    'sentences:["Then, she started walking every day and eating better.","Finally, she felt much healthier and more energetic.","First, Anna decided to change her unhealthy habits."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Make a decision → change habits → feel better."'
  ),
  # technology_gadgets
  (
    'sentences:["Within a few days, it had become her favourite device.","She researched different models online for two weeks.","She set it up and transferred her files from the old laptop.","Finally, she ordered a laptop and it arrived the next day."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Research → order → set up → settled in."',
    'sentences:["Then, she set it up and transferred all her files.","Finally, it became her favourite device within days.","First, she spent two weeks researching laptops online."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Research → set up → love it."'
  ),
  # the_environment
  (
    'sentences:["The amount of waste sent to landfill dropped by 40%.","A local school started a recycling programme three years ago.","Students collected paper, plastic, and glass separately.","Local businesses joined and donated recycling containers."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Programme starts → students collect → businesses join → results improve."',
    'sentences:["Then, students began sorting paper, plastic, and glass.","Finally, the amount of waste dropped by 40 percent.","First, the school started a recycling programme."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Start programme → sort waste → see results."'
  ),
  # sports_fitness
  (
    'sentences:["He crossed the finish line and raised his arms in celebration.","Tom signed up for a 10km race six months ago.","He trained three times a week and followed a strict diet.","On race day, he felt nervous but excited at the start line."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Sign up → train → race day nerves → finish line."',
    'sentences:["Then, he trained three times a week for six months.","Finally, he crossed the finish line and celebrated.","First, Tom signed up for a 10km race."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Sign up → train → finish the race."'
  ),
  # family_life
  (
    'sentences:["Everyone agreed it had been the best family gathering in years.","The family decided to hold a reunion for their grandmother\'s 80th birthday.","Relatives travelled from as far as Australia and Canada.","They spent the weekend sharing meals, stories, and old photographs."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Decision → relatives arrive → weekend activities → final agreement."',
    'sentences:["Then, relatives travelled from as far as Australia.","First, the family planned a reunion for their grandmother.","Finally, everyone agreed it was the best gathering in years."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Plan the reunion → relatives arrive → a great success."'
  ),
  # education_studying
  (
    'sentences:["By the end of the week, she felt settled and excited about the year ahead.","Emma arrived at her new university on a sunny Monday morning.","She attended her first lectures and met her tutors.","In the evenings, she met her flatmates and explored the campus."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Arrival → lectures and tutors → evenings on campus → settled in."',
    'sentences:["Then, she attended her first lectures and met her tutors.","First, Emma arrived at university on a Monday morning.","Finally, she felt settled and excited by the weekend."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Arrive → attend lectures → feel settled."'
  ),
  # money_banking
  (
    'sentences:["They booked the flights and hotel and celebrated that evening.","James and his partner decided to save for a two-week holiday.","They created a budget and set aside money each month.","After six months, they had saved enough for the trip."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Decision → budget → save → book."',
    'sentences:["Then, they saved money every month for six months.","Finally, they booked the flights and celebrated.","First, James and his partner decided to save for a holiday."],correctOrder:[2,0,1],answer:"2,0,1",explanation:"Decide to save → save each month → book the holiday."'
  ),
  # shopping_fashion
  (
    'sentences:["She left the mall happy, having spent less than she planned.","Laura went to the shopping centre to find an outfit for a wedding.","She tried on several dresses but couldn\'t find the right one.","In the last shop, she found a perfect blue dress in the sale."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Goal → search → no luck → found it → happy ending."',
    'sentences:["Then, she tried on several dresses but found nothing.","First, Laura went shopping to find an outfit for a wedding.","Finally, she found a perfect blue dress in the sale."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Go shopping → try dresses → find the perfect one."'
  ),
  # music
  (
    'sentences:["The audience erupted in applause at the end of the set.","For two months, the band rehearsed every weekend in a garage.","The night arrived, and they were nervous but ready.","They stepped onto the small stage at a local café and played their first gig."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Rehearse → night arrives → step on stage → audience reaction."',
    'sentences:["Then, the night arrived and they were nervous but ready.","First, the band rehearsed every weekend for two months.","Finally, the audience clapped loudly at the end."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Rehearse → performance night → applause."'
  ),
  # social_media_internet
  (
    'sentences:["A year later, she had over 50,000 followers.","Maria decided to start a cooking channel on a video platform.","Her fourth video went viral and gained 200,000 views overnight.","She posted one video a week for six months with little response."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Decision → months of quiet posting → viral moment → large following."',
    'sentences:["Then, she posted one video a week for six months.","First, Maria decided to start a cooking channel online.","Finally, one video went viral and she gained thousands of followers."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Start a channel → post regularly → go viral."'
  ),
  # ambitions_goals
  (
    'sentences:["Ten years later, her fashion brand was sold in shops across Europe.","From a young age, Sofia dreamed of becoming a fashion designer.","She studied design, worked for free at fashion houses, and never gave up.","She launched her own brand at 28 with just a small loan."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Early dream → study and sacrifice → launch → success."',
    'sentences:["Then, she studied hard and worked at fashion houses for free.","First, Sofia dreamed of becoming a fashion designer.","Finally, she launched her own brand and became successful."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Dream big → work hard → achieve success."'
  ),
  # culture_traditions
  (
    'sentences:["By the end of the evening, he felt like part of the community.","Marco visited a small Spanish town during its annual summer festival.","He watched the traditional dances and tried local food and wine.","A local family invited him to join their table and celebrate with them."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Visit → watch and taste → invited → feel part of community."',
    'sentences:["Then, he watched the dances and tried the local food.","First, Marco visited a small Spanish town during its festival.","Finally, a local family invited him to join their celebration."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Visit the town → enjoy the festival → join the locals."'
  ),
  # films_tv
  (
    'sentences:["They stayed up until midnight discussing the ending.","Jake and his friends met at his flat for a film night.","They chose a critically acclaimed thriller that none of them had seen.","The film was so gripping that nobody spoke for two hours."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Gather → choose film → gripping silence → late-night discussion."',
    'sentences:["Then, the film was so gripping that nobody spoke.","First, Jake and his friends chose a thriller to watch.","Finally, they stayed up until midnight discussing the ending."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Choose the film → watch in silence → discuss afterwards."'
  ),
  # books_reading
  (
    'sentences:["Now she reads every book this author publishes on the day it comes out.","A colleague recommended a thriller to her during their lunch break.","She read the whole thing in a single weekend and loved it.","She found more books by the same author at her local library."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Recommendation → read it → find more books → devoted reader."',
    'sentences:["Then, she read the whole book in a single weekend.","First, a colleague recommended a thriller during lunch.","Finally, she borrowed more books by the same author."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Get a recommendation → read it → want more."'
  ),
  # home_housing
  (
    'sentences:["Within a month, their new flat felt like home.","The company offered Tom a job in another city.","They found a flat near the city centre and signed the lease.","He and his partner spent two weekends viewing properties."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Job offer → view properties → sign lease → settle in."',
    'sentences:["Then, they spent two weekends looking at flats.","First, a company offered Tom a job in a new city.","Finally, they signed the lease and felt settled within a month."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Get the job offer → search for a flat → move in."'
  ),
  # food_restaurants
  (
    'sentences:["They both agreed it had been one of the best meals they had ever had.","David booked a table at a restaurant his colleague had recommended.","The food was exceptional — both the presentation and the flavour.","When they arrived, the manager led them to a table by the window."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Book table → arrive and seated → exceptional food → final verdict."',
    'sentences:["Then, they sat by the window and ordered their meal.","First, David booked a table at a restaurant his friend recommended.","Finally, they agreed it was one of the best meals they had ever had."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Book the table → arrive and eat → agree it was wonderful."'
  ),
  # cities_travel
  (
    'sentences:["By evening, they were exhausted but full of stories to tell.","Ana and her friend arrived in Prague on a Friday morning.","They picked up a city map and headed to the historic centre.","They visited three museums, tried local food, and got wonderfully lost."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Arrive → get map → explore → tired but happy."',
    'sentences:["Then, they picked up a map and headed to the old town.","First, Ana and her friend arrived in Prague on Friday morning.","Finally, they were tired but full of stories by the evening."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Arrive → explore the city → end the day happy."'
  ),
  # science_discovery
  (
    'sentences:["The discovery was later used to develop a new cancer treatment.","A research team began studying an unusual protein found in deep-sea fish.","They ran hundreds of tests over three years and recorded their findings.","One experiment produced a completely unexpected result."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Begin study → run tests → unexpected result → breakthrough applied."',
    'sentences:["Then, they ran hundreds of tests and recorded their results.","First, a research team began studying an unusual protein.","Finally, the discovery was used to develop a new treatment."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Begin the study → run tests → apply the discovery."'
  ),
  # friendship
  (
    'sentences:["They talked for hours as if no time had passed at all.","Lena and her old school friend had not been in contact for six years.","One day, Lena found her friend\'s number and decided to call.","They met for coffee the following weekend."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Six years apart → decide to call → meet for coffee → talk for hours."',
    'sentences:["Then, Lena found her friend\'s number and decided to call.","First, Lena and her school friend had not spoken for six years.","Finally, they met for coffee and talked for hours."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Lose contact → decide to call → meet up and reconnect."'
  ),
  # celebrations_parties
  (
    'sentences:["Her friends arrived, and the look of surprise on her face was unforgettable.","Carlos spent weeks secretly planning a surprise party for his sister.","He booked a private room at her favourite restaurant.","He invited thirty of her closest friends and told them to keep it secret."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Secret planning → book venue → invite friends → the surprise moment."',
    'sentences:["Then, he booked a room and invited all her closest friends.","First, Carlos spent weeks secretly planning a surprise party.","Finally, her friends arrived and the surprise was unforgettable."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Plan in secret → book and invite → the big surprise."'
  ),
  # emotions_feelings
  (
    'sentences:["She realised that nerves had actually helped her perform better.","Sophie was terrified about presenting her project to the whole department.","She rehearsed carefully and took deep breaths before walking in.","The presentation went smoothly, and her manager praised her work."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Terror → prepare → perform well → positive reflection."',
    'sentences:["Then, she rehearsed carefully and took deep breaths.","First, Sophie felt terrified about presenting to the whole team.","Finally, the presentation went well and her manager praised her."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Feel nervous → prepare carefully → perform well."'
  ),
  # language_communication
  (
    'sentences:["A year later, he had his first full conversation in Japanese.","Ben decided to learn Japanese after watching a documentary about Tokyo.","He downloaded a language app and practised for 20 minutes every day.","After six months, he enrolled in an evening class at a local college."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Decision → daily app practice → evening class → first real conversation."',
    'sentences:["Then, he downloaded an app and practised every day.","First, Ben decided to learn Japanese after watching a documentary.","Finally, a year later, he had his first full conversation."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Make a decision → practise daily → speak the language."'
  ),
  # news_current_affairs
  (
    'sentences:["The article won a national award for investigative journalism.","Elena received a tip about financial fraud at a major company.","She spent three months gathering evidence and interviewing sources.","She published the full story on the front page of her newspaper."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Receive tip → gather evidence → publish story → win award."',
    'sentences:["Then, she spent three months gathering evidence.","First, Elena received a tip about fraud at a large company.","Finally, she published the story and it won a national award."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Receive the tip → gather evidence → publish and win."'
  ),
  # hobbies_free_time
  (
    'sentences:["Six months later, he entered his first local photography competition.","Mark borrowed his friend\'s camera to photograph some local scenery.","He was so pleased with the results that he bought his own camera.","He began taking photographs every weekend and sharing them online."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Borrow camera → pleased with results → buy own camera → enter competition."',
    'sentences:["Then, he was so pleased that he bought his own camera.","First, Mark borrowed his friend\'s camera to take some photos.","Finally, six months later, he entered his first competition."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Borrow a camera → love the results → buy your own."'
  ),
  # nature_animals
  (
    'sentences:["It was a moment she would never forget.","Clara was hiking through a national park when she stopped suddenly.","A large deer was standing just fifteen metres from the path.","She stood completely still and watched it for nearly five minutes."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Hiking → stop suddenly → see deer → watch in silence → memorable moment."',
    'sentences:["Then, she saw a large deer just fifteen metres away.","First, Clara was hiking when she suddenly stopped.","Finally, she stood still and watched it for five minutes."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Hiking → spot the deer → watch in silence."'
  ),
  # jobs_interviews
  (
    'sentences:["She began her new role as team leader the following month.","Sarah had been working as a junior analyst for three years.","Her manager called her in for a meeting and offered her a promotion.","She had consistently delivered excellent results and supported her colleagues."],correctOrder:[1,3,2,0],answer:"1,3,2,0",explanation:"Three years in role → consistent performance → manager offers promotion → new role begins."',
    'sentences:["Then, she consistently delivered excellent results for three years.","First, Sarah started working as a junior analyst.","Finally, her manager offered her a promotion to team leader."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Start the job → work hard → earn a promotion."'
  ),
  # past_memories
  (
    'sentences:["She realised how much the place — and she herself — had changed.","After fifteen years abroad, Helen returned to her hometown for the first time.","She walked down streets she had played on as a child and visited her old school.","She met a few old friends for coffee and spent hours catching up."],correctOrder:[1,2,3,0],answer:"1,2,3,0",explanation:"Return after years → walk old streets → meet old friends → reflect on change."',
    'sentences:["Then, she walked down streets she had played on as a child.","First, Helen returned to her hometown after fifteen years abroad.","Finally, she met old friends for coffee and caught up."],correctOrder:[1,0,2],answer:"1,0,2",explanation:"Return home → revisit old places → catch up with friends."'
  ),
]

# ── 2. REARRANGE REPLACEMENTS ──────────────────────────────────────────────────
RR = [
  # travel_holidays
  (
    'words:["I","have","never","been","abroad","before"],answer:"I have never been abroad before",explanation:"Frequency adverbs go between the auxiliary and past participle."',
    'words:["She","packed","her","bags","the","night","before"],answer:"She packed her bags the night before",explanation:"Subject + past simple + object + time phrase."'
  ),
  # work_office
  (
    'words:["she","called","an","emergency","meeting"],answer:"she called an emergency meeting",explanation:"Subject + verb + article + adjective + noun."',
    'words:["she","sent","the","report","by","Friday"],answer:"she sent the report by Friday",explanation:"Subject + verb + object + time phrase."'
  ),
  # cooking_recipes
  (
    'words:["the","dough","needs","to","rest","for","an","hour"],answer:"the dough needs to rest for an hour",explanation:"Subject + needs to + infinitive + time phrase."',
    'words:["add","the","eggs","one","by","one"],answer:"add the eggs one by one",explanation:"Imperative + object + adverbial phrase."'
  ),
  # health_wellbeing
  (
    'words:["getting","enough","sleep","is","essential","for","good","health"],answer:"getting enough sleep is essential for good health",explanation:"Gerund phrase as subject + is + adjective + prepositional phrase."',
    'words:["sleep","is","essential","for","good","health"],answer:"sleep is essential for good health",explanation:"Subject + is + adjective + prepositional phrase."'
  ),
  # technology_gadgets
  (
    'words:["you","should","back","up","your","files","regularly"],answer:"you should back up your files regularly",explanation:"Subject + modal + phrasal verb + object + adverb."',
    'words:["you","should","back","up","your","files"],answer:"you should back up your files",explanation:"Subject + modal + phrasal verb + object."'
  ),
  # the_environment
  (
    'words:["we","should","use","less","plastic","in","our","daily","lives"],answer:"we should use less plastic in our daily lives",explanation:"Subject + modal + verb + object + prepositional phrase."',
    'words:["we","should","use","less","plastic"],answer:"we should use less plastic",explanation:"Subject + modal + verb + object."'
  ),
  # sports_fitness
  (
    'words:["she","has","played","tennis","since","childhood"],answer:"she has played tennis since childhood",explanation:"Subject + present perfect + object + since + time reference."',
    'words:["she","trains","every","day","after","work"],answer:"she trains every day after work",explanation:"Subject + verb + frequency + time phrase."'
  ),
  # family_life
  (
    'words:["my","parents","got","married","in","a","small","village","church"],answer:"my parents got married in a small village church",explanation:"Subject + verb + past participle + prepositional phrase."',
    'words:["my","parents","got","married","in","a","small","church"],answer:"my parents got married in a small church",explanation:"Subject + verb + past participle + prepositional phrase."'
  ),
  # education_studying
  (
    'words:["students","are","expected","to","hand","in","assignments","on","time"],answer:"students are expected to hand in assignments on time",explanation:"Passive + infinitive structure: \'are expected to + verb\'."',
    'words:["students","must","hand","in","work","on","time"],answer:"students must hand in work on time",explanation:"Subject + modal + phrasal verb + object + time phrase."'
  ),
  # money_banking
  (
    'words:["she","decided","to","open","a","savings","account","last","year"],answer:"she decided to open a savings account last year",explanation:"Subject + decided to + infinitive + object + time expression."',
    'words:["she","opened","a","savings","account","last","year"],answer:"she opened a savings account last year",explanation:"Subject + past simple + object + time expression."'
  ),
  # shopping_fashion
  (
    'words:["she","always","checks","the","sale","section","before","buying","anything","full","price"],answer:"she always checks the sale section before buying anything full price",explanation:"Subject + frequency adverb + verb + object + before + gerund phrase."',
    'words:["she","always","checks","the","sale","section","first"],answer:"she always checks the sale section first",explanation:"Subject + frequency adverb + verb + object + adverb."'
  ),
  # music
  (
    'words:["he","taught","himself","to","play","guitar","at","the","age","of","fourteen"],answer:"he taught himself to play guitar at the age of fourteen",explanation:"Subject + reflexive verb + to + infinitive + time phrase."',
    'words:["he","taught","himself","to","play","guitar"],answer:"he taught himself to play guitar",explanation:"Subject + reflexive verb + to + infinitive + object."'
  ),
  # social_media_internet
  (
    'words:["she","spends","too","much","time","scrolling","through","her","phone"],answer:"she spends too much time scrolling through her phone",explanation:"Subject + verb + too much + noun + gerund phrase."',
    'words:["she","spends","too","much","time","on","her","phone"],answer:"she spends too much time on her phone",explanation:"Subject + verb + too much + noun + prepositional phrase."'
  ),
  # ambitions_goals
  (
    'words:["she","is","determined","to","make","a","difference","in","her","community"],answer:"she is determined to make a difference in her community",explanation:"Subject + is determined to + infinitive + prepositional phrase."',
    'words:["she","is","determined","to","make","a","difference"],answer:"she is determined to make a difference",explanation:"Subject + is determined to + infinitive + object."'
  ),
  # culture_traditions
  (
    'words:["learning","about","other","cultures","helps","us","understand","the","world","better"],answer:"learning about other cultures helps us understand the world better",explanation:"Gerund phrase as subject + verb + object + bare infinitive."',
    'words:["learning","about","other","cultures","helps","us"],answer:"learning about other cultures helps us",explanation:"Gerund phrase as subject + verb + object."'
  ),
  # films_tv
  (
    'words:["the","director","has","been","making","films","for","over","twenty","years"],answer:"the director has been making films for over twenty years",explanation:"Subject + present perfect continuous + object + for + duration."',
    'words:["the","director","has","been","making","films","for","years"],answer:"the director has been making films for years",explanation:"Subject + present perfect continuous + object + for + duration."'
  ),
  # books_reading
  (
    'words:["she","always","reads","before","bed","to","help","her","relax"],answer:"she always reads before bed to help her relax",explanation:"Subject + frequency adverb + verb + time phrase + infinitive of purpose."',
    'words:["she","always","reads","before","bed"],answer:"she always reads before bed",explanation:"Subject + frequency adverb + verb + time phrase."'
  ),
  # home_housing
  (
    'words:["we","decided","to","move","to","a","bigger","house","when","our","second","child","was","born"],answer:"we decided to move to a bigger house when our second child was born",explanation:"Main clause + time clause with when + past simple."',
    'words:["we","moved","to","a","bigger","house","last","year"],answer:"we moved to a bigger house last year",explanation:"Subject + past simple + object + time phrase."'
  ),
  # food_restaurants
  (
    'words:["she","asked","the","waiter","to","bring","some","extra","bread"],answer:"she asked the waiter to bring some extra bread",explanation:"Subject + asked + object + to + infinitive."',
    'words:["she","asked","for","some","extra","bread"],answer:"she asked for some extra bread",explanation:"Subject + asked for + object."'
  ),
  # cities_travel
  (
    'words:["the","city","centre","has","been","transformed","by","new","investment","in","recent","years"],answer:"the city centre has been transformed by new investment in recent years",explanation:"Subject + present perfect passive + agent + time phrase."',
    'words:["the","city","has","changed","a","lot","recently"],answer:"the city has changed a lot recently",explanation:"Subject + present perfect + object + adverb."'
  ),
  # science_discovery
  (
    'words:["the","experiment","was","repeated","three","times","to","confirm","the","results"],answer:"the experiment was repeated three times to confirm the results",explanation:"Subject + passive verb + frequency + infinitive of purpose."',
    'words:["the","experiment","was","repeated","three","times"],answer:"the experiment was repeated three times",explanation:"Subject + passive verb + frequency."'
  ),
  # friendship
  (
    'words:["a","true","friend","is","someone","who","tells","you","the","truth"],answer:"a true friend is someone who tells you the truth",explanation:"Subject + relative clause with \'who\' + verb + object."',
    'words:["a","true","friend","always","tells","you","the","truth"],answer:"a true friend always tells you the truth",explanation:"Subject + frequency adverb + verb + object."'
  ),
  # celebrations_parties
  (
    'words:["everyone","agreed","it","was","the","best","party","they","had","ever","been","to"],answer:"everyone agreed it was the best party they had ever been to",explanation:"Main clause + embedded clause with superlative + \'ever\'."',
    'words:["everyone","agreed","it","was","the","best","party"],answer:"everyone agreed it was the best party",explanation:"Main clause + embedded clause."'
  ),
  # emotions_feelings
  (
    'words:["she","was","relieved","when","she","heard","she","had","passed","the","exam"],answer:"she was relieved when she heard she had passed the exam",explanation:"Main clause + when + past simple + past perfect for earlier event."',
    'words:["she","was","relieved","to","hear","the","good","news"],answer:"she was relieved to hear the good news",explanation:"Subject + adjective + infinitive + object."'
  ),
  # language_communication
  (
    'words:["learning","a","language","takes","time","and","a","lot","of","patience"],answer:"learning a language takes time and a lot of patience",explanation:"Gerund phrase as subject + verb + two objects joined by \'and\'."',
    'words:["learning","a","language","takes","time"],answer:"learning a language takes time",explanation:"Gerund phrase as subject + verb + object."'
  ),
  # news_current_affairs
  (
    'words:["the","prime","minister","announced","new","measures","to","tackle","rising","prices"],answer:"the prime minister announced new measures to tackle rising prices",explanation:"Subject + past simple + object + infinitive of purpose."',
    'words:["the","new","law","was","announced","yesterday"],answer:"the new law was announced yesterday",explanation:"Subject + passive verb + time adverb."'
  ),
  # hobbies_free_time
  (
    'words:["learning","to","knit","has","given","her","a","wonderful","creative","outlet"],answer:"learning to knit has given her a wonderful creative outlet",explanation:"Gerund phrase as subject + present perfect + indirect object + direct object."',
    'words:["she","takes","photographs","every","weekend"],answer:"she takes photographs every weekend",explanation:"Subject + verb + object + time phrase."'
  ),
  # nature_animals
  (
    'words:["scientists","believe","that","thousands","of","species","are","at","risk","of","extinction"],answer:"scientists believe that thousands of species are at risk of extinction",explanation:"Main clause + \'that\' clause with prepositional phrase."',
    'words:["many","species","are","at","risk","of","extinction"],answer:"many species are at risk of extinction",explanation:"Subject + verb + prepositional phrase."'
  ),
  # jobs_interviews
  (
    'words:["she","impressed","the","interviewers","with","her","confidence","and","preparation"],answer:"she impressed the interviewers with her confidence and preparation",explanation:"Subject + verb + object + prepositional phrase."',
    'words:["she","impressed","the","interviewers","with","her","confidence"],answer:"she impressed the interviewers with her confidence",explanation:"Subject + verb + object + prepositional phrase."'
  ),
  # past_memories
  (
    'words:["she","found","some","old","photographs","while","sorting","through","her","parents","belongings"],answer:"she found some old photographs while sorting through her parents belongings",explanation:"Main clause + while + gerund clause."',
    'words:["she","found","old","photos","while","sorting","her","things"],answer:"she found old photos while sorting her things",explanation:"Main clause + while + gerund clause."'
  ),
]

# ── 3. MULTIPLE CHOICE: REDUCE FROM 4 OPTIONS TO 3 ────────────────────────────
# Strategy: parse each MC question, find the correct answer, keep it + 2 wrong options
def reduce_mc_options(text):
    """Find all multiple_choice entries and reduce to 3 options."""
    pattern = re.compile(
        r'(\{type:"multiple_choice",question:"[^"]*",options:\[)(.*?)(\],answer:")(.*?)(")',
        re.DOTALL
    )

    def fix_match(m):
        prefix = m.group(1)
        opts_str = m.group(2)
        mid = m.group(3)
        answer = m.group(4)
        suffix = m.group(5)

        # Parse options - split by '","' pattern
        # Options are like: "opt1","opt2","opt3","opt4"
        # We need to carefully split them
        opts_raw = opts_str.strip()

        # Use a simple approach: split on '","'
        parts = re.split(r'","', opts_raw)
        # Clean up quotes from first and last
        if parts:
            parts[0] = parts[0].lstrip('"')
            parts[-1] = parts[-1].rstrip('"')

        if len(parts) <= 3:
            return m.group(0)  # Already 3 or fewer, skip

        # Find the correct answer index
        correct_idx = None
        for i, p in enumerate(parts):
            if p == answer:
                correct_idx = i
                break

        if correct_idx is None:
            return m.group(0)  # Can't find answer, skip

        # Keep correct answer + first 2 wrong options (excluding correct)
        wrong = [p for i, p in enumerate(parts) if i != correct_idx]
        keep_wrong = wrong[:2]  # Keep 2 wrong options

        new_opts = [answer] + keep_wrong
        # Shuffle so correct isn't always first - put correct at its original position mod 3
        new_pos = correct_idx % 3
        new_opts.insert(new_pos, new_opts.pop(0))

        new_opts_str = '","'.join(new_opts)
        return f'{prefix}"{new_opts_str}"{mid}{answer}{suffix}'

    return pattern.sub(fix_match, text)

# ── APPLY CHANGES ──────────────────────────────────────────────────────────────
print("Applying story_builder rewrites...")
for i, (old, new) in enumerate(SB):
    if old in src:
        src = src.replace(old, new)
        print(f"  ✓ story_builder #{i+1}")
    else:
        print(f"  ✗ story_builder #{i+1} NOT FOUND")

print("\nApplying rearrange rewrites...")
for i, (old, new) in enumerate(RR):
    if old in src:
        src = src.replace(old, new)
        print(f"  ✓ rearrange #{i+1}")
    else:
        print(f"  ✗ rearrange #{i+1} NOT FOUND")

print("\nReducing multiple_choice options to 3...")
src_new = reduce_mc_options(src)
# Count changes
mc_before = src.count('"multiple_choice"')
print(f"  Processed {mc_before} multiple_choice questions")

with open(FILEPATH, "w") as f:
    f.write(src_new)

print("\nDone! File updated.")
