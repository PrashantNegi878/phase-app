/**
 * Curated wellness suggestion bank.
 * Each suggestion now includes a list of suitable schedules.
 */

type Phase =
  | 'menstrual'
  | 'follicular'
  | 'ovulation'
  | 'luteal'
  | 'extended-follicular'
  | 'pending';

type SupportStyle =
  | 'acts-of-service'
  | 'gifts'
  | 'emotional-support'
  | 'quality-time'
  | 'physical-touch';

type Schedule =
  | 'busy-student'
  | 'flexible'
  | 'strict-gym-routine'
  | 'business-professional';

interface Suggestion {
  text: string;
  schedules?: Schedule[]; // If missing, suitable for all
}

// ─── Partner suggestions (supporting a linked tracker) ────────────────────────

const partnerSuggestions: Record<SupportStyle, Record<Phase, Suggestion[]>> = {
  'acts-of-service': {
    menstrual: [
      { text: 'Offer to handle household chores today so they can fully rest without guilt.', schedules: ['flexible', 'busy-student', 'strict-gym-routine'] },
      { text: 'Prepare a warm meal or pick up their favourite comfort food without being asked.', schedules: ['flexible', 'business-professional'] },
      { text: 'Run a hot bath with Epsom salts and have a heating pad ready for cramp relief.', schedules: ['flexible'] },
      { text: 'Take care of any errands or tasks on their list so they can focus on recovery.', schedules: ['flexible', 'business-professional'] },
      { text: 'Make their space extra cozy with fresh sheets and bring them everything they need to rest.', schedules: ['flexible', 'busy-student'] },
      { text: 'Quietly take on any responsibilities that might otherwise stress them out today.', schedules: ['business-professional', 'busy-student'] },
    ],
    follicular: [
      { text: 'Help clear space for a new project or goal they have been putting off.', schedules: ['flexible', 'busy-student'] },
      { text: 'Prepare a nutritious meal to support their growing energy and motivation.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Offer to be their accountability partner for a goal they want to pursue this week.', schedules: ['busy-student', 'strict-gym-routine', 'business-professional'] },
      { text: 'Tidy up the shared spaces so their environment feels as fresh as they do.', schedules: ['flexible', 'busy-student'] },
      { text: 'Plan ahead and handle logistics for something they have been wanting to do.', schedules: ['flexible', 'business-professional'] },
      { text: 'Anticipate what they might need before they have to ask.', schedules: ['business-professional', 'busy-student'] },
    ],
    ovulation: [
      { text: 'Organise a social outing or dinner with friends they have been meaning to see.', schedules: ['flexible', 'business-professional'] },
      { text: 'Help them prepare for any big presentation or meeting coming up this week.', schedules: ['business-professional', 'busy-student'] },
      { text: 'Handle background tasks so they can focus on the social connections they crave.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'Suggest and plan a fun activity that takes advantage of their peak energy.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Take something off their plate so they can fully enjoy this high-confidence period.', schedules: ['flexible', 'business-professional'] },
      { text: 'Quietly sort out logistics so they can be present and spontaneous.', schedules: ['flexible', 'business-professional'] },
    ],
    luteal: [
      { text: 'Take on extra household responsibilities without waiting to be asked.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Prepare calming herbal teas and nutrient-rich snacks to ease PMS symptoms.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Handle stressful communications or decisions on their behalf where possible.', schedules: ['business-professional', 'busy-student'] },
      { text: 'Reduce their cognitive load by managing the logistics and planning for the day.', schedules: ['flexible', 'business-professional'] },
      { text: 'Quietly take care of the tasks they find draining so they can preserve their energy.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Anticipate their needs and act before they have to explain themselves.', schedules: ['flexible', 'business-professional'] },
    ],
    'extended-follicular': [
      { text: 'Help them channel their elevated energy into something productive or creative.', schedules: ['flexible', 'busy-student'] },
      { text: 'Offer to assist with a goal or project that has been on their radar.', schedules: ['flexible', 'business-professional'] },
      { text: 'Prepare meals that sustain their energy without weighing them down.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Handle behind-the-scenes logistics so they can enjoy their current momentum.', schedules: ['flexible', 'business-professional'] },
      { text: 'Ask what you can take off their plate today so they can focus on what matters to them.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Keep the home running smoothly so they can pour energy into their enthusiasm.', schedules: ['flexible', 'busy-student'] },
    ],
    pending: [
      { text: 'Take initiative on household tasks to give them space to settle into a new cycle.', schedules: ['flexible', 'busy-student'] },
      { text: 'Prepare comforting meals and keep the home environment stress-free.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Handle any upcoming scheduling or errands proactively.', schedules: ['flexible', 'business-professional'] },
      { text: 'Ask what one thing you can take care of today that would mean the most to them.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Keep the shared space calm and tidy small acts of care accumulate into real support.', schedules: ['flexible', 'busy-student'] },
      { text: 'Just be reliable and consistent that alone is a meaningful act of service.', schedules: ['flexible', 'business-professional'] },
    ],
  },

  gifts: {
    menstrual: [
      { text: 'Pick up a small comfort gift a cozy candle, chocolate, or a favourite snack.', schedules: ['flexible', 'business-professional'] },
      { text: 'Order herbal tea or period relief patches as a sweet surprise.', schedules: ['flexible', 'busy-student'] },
      { text: 'Leave a handwritten note of encouragement somewhere they will find it.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Get their favourite movie or show queued up alongside a treat they love.', schedules: ['flexible', 'busy-student'] },
      { text: 'Send a small care package even a simple one shows you pay attention.', schedules: ['flexible', 'business-professional'] },
      { text: 'Pick up a heating pad or a new comfort item specifically for relief.', schedules: ['flexible', 'strict-gym-routine'] },
    ],
    follicular: [
      { text: 'Buy a small item related to a new interest or goal they mentioned recently.', schedules: ['flexible', 'busy-student'] },
      { text: 'Get them a journal, planner, or book that aligns with their current energy.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Bring home fresh flowers to celebrate the fresh start of this phase.', schedules: ['flexible', 'business-professional'] },
      { text: 'Pick up an ingredient for a recipe they want to try and leave it as a surprise.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Gift them something that says "I believe in what you are working on."', schedules: ['business-professional', 'busy-student'] },
      { text: 'Find something that sparks curiosity this phase loves novelty.', schedules: ['flexible', 'busy-student'] },
    ],
    ovulation: [
      { text: 'Plan a surprise dinner or experience to match their outgoing peak energy.', schedules: ['flexible', 'business-professional'] },
      { text: 'Get tickets to something they would enjoy a show, a class, or an event.', schedules: ['flexible', 'business-professional'] },
      { text: 'Pick up something that celebrates how confident and vibrant they feel right now.', schedules: ['flexible', 'business-professional'] },
      { text: 'Bring flowers or a meaningful small token that makes them feel seen.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'Surprise them with something social a gift meant to be enjoyed together.', schedules: ['flexible', 'business-professional'] },
      { text: 'Lean into something celebratory they are thriving and deserve to feel it.', schedules: ['flexible', 'business-professional'] },
    ],
    luteal: [
      { text: 'Pick up a cozy self-care item a face mask, bath salts, or a comfort snack.', schedules: ['flexible', 'busy-student'] },
      { text: 'Order something warming like soup, herbal remedies, or a hot drink they enjoy.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Leave a card or small note that validates how hard they are working through this phase.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Get a small stress-relief gift an essential oil roller or anything calming.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Surprise them with something that says: "I see how much you are carrying right now."', schedules: ['business-professional', 'busy-student'] },
      { text: 'Pick up magnesium supplements or an evening tea practical care is still care.', schedules: ['flexible', 'strict-gym-routine'] },
    ],
    'extended-follicular': [
      { text: 'Pick up something that supports their current streak of energy and creativity.', schedules: ['flexible', 'busy-student'] },
      { text: 'Get a small gift tied to something they have mentioned wanting to explore.', schedules: ['flexible', 'business-professional'] },
      { text: 'Bring them a practical item that helps them make the most of their momentum.', schedules: ['busy-student', 'strict-gym-routine'] },
      { text: 'Leave a surprise that shows you notice their hard work and want to fuel it.', schedules: ['business-professional', 'busy-student'] },
      { text: 'Gift something that combines care and practicality snacks, tools, or a treat.', schedules: ['flexible', 'strict-gym-routine', 'busy-student'] },
      { text: 'A small investment in a goal of theirs says you take their ambitions seriously.', schedules: ['business-professional', 'busy-student'] },
    ],
    pending: [
      { text: 'Leave a small, thoughtful token that shows you are thinking of them.', schedules: ['flexible', 'busy-student'] },
      { text: 'Pick up a comfort item or snack they enjoy without needing a specific occasion.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Surprise them with something low-key that makes their day a little brighter.', schedules: ['flexible', 'business-professional'] },
      { text: 'A simple gift can go a long way it does not have to be elaborate.', schedules: ['flexible', 'busy-student'] },
      { text: 'Get something personal a reminder of a shared memory or inside joke.', schedules: ['flexible', 'business-professional'] },
      { text: 'The gesture matters more than the size of the gift right now.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    ],
  },

  'emotional-support': {
    menstrual: [
      { text: 'Check in gently without offering solutions sometimes just being present is everything.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Let them know it is completely okay to cancel plans, rest, and take up space.', schedules: ['flexible', 'business-professional'] },
      { text: 'Validate how they are feeling without trying to fix or minimise it.', schedules: ['flexible', 'busy-student'] },
      { text: 'Ask "What do you need most from me right now?" and genuinely listen to the answer.', schedules: ['flexible', 'business-professional'] },
      { text: 'Remind them that you are proud of them even on the days they do not feel their best.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Create space for silence not every difficult moment needs to be talked through.', schedules: ['flexible', 'business-professional'] },
    ],
    follicular: [
      { text: 'Express genuine excitement about their ideas and goals this week.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Ask about something they have been looking forward to and celebrate it with them.', schedules: ['flexible', 'business-professional'] },
      { text: 'Affirm their growing energy let them know their enthusiasm is contagious.', schedules: ['flexible', 'busy-student'] },
      { text: 'Be a sounding board for any new plans they want to think through out loud.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Show up curious and engaged your interest fuels their momentum right now.', schedules: ['flexible', 'busy-student'] },
      { text: 'Match their optimism this phase thrives on encouragement and possibility.', schedules: ['flexible', 'business-professional'] },
    ],
    ovulation: [
      { text: 'Tell them directly how much you appreciate their warmth, wit, and energy.', schedules: ['flexible', 'business-professional'] },
      { text: 'Make time for a real conversation they are at their most socially connected.', schedules: ['flexible', 'business-professional'] },
      { text: 'Express admiration genuinely compliments land especially well during this phase.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'Show up to any social event or activity they invite you to with real enthusiasm.', schedules: ['flexible', 'business-professional', 'strict-gym-routine'] },
      { text: 'Reflect back the best things you see in them they are glowing and deserve to hear it.', schedules: ['flexible', 'business-professional'] },
      { text: 'Be open and communicative they are at their best at giving and receiving right now.', schedules: ['flexible', 'business-professional'] },
    ],
    luteal: [
      { text: 'Reassure them that their feelings are valid and do not need to be explained away.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Create a judgment-free space this is not the time for heavy criticism or conflict.', schedules: ['flexible', 'business-professional'] },
      { text: 'Let them vent without rushing to offer solutions unless they specifically ask.', schedules: ['flexible', 'busy-student'] },
      { text: 'Say "I am here" and mean it your steady presence matters more than your words.', schedules: ['flexible', 'business-professional'] },
      { text: 'Remind them that mood shifts are temporary and that you are not going anywhere.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Do not take it personally if they need more space just stay available and calm.', schedules: ['flexible', 'business-professional'] },
    ],
    'extended-follicular': [
      { text: 'Engage with their ideas and encourage them to keep going on what they have started.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Ask thoughtful questions that show you have been paying attention to their goals.', schedules: ['flexible', 'business-professional'] },
      { text: 'Offer a listening ear for anything they are processing or working through.', schedules: ['flexible', 'busy-student'] },
      { text: 'Remind them how far they have come your perspective matters to them.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Let your consistency and calm be the emotional anchor they can rely on.', schedules: ['flexible', 'business-professional'] },
      { text: 'Celebrate the small wins alongside the big ones they add up.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    ],
    pending: [
      { text: 'Check in softly and let them set the tone for how much support they need.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Remind them that you are here without pressure or expectation.', schedules: ['flexible', 'business-professional'] },
      { text: 'Be patient and steady your calm presence is reassuring during uncertain moments.', schedules: ['flexible', 'busy-student'] },
      { text: 'Ask one open-ended question and really listen to where they are at.', schedules: ['flexible', 'business-professional'] },
      { text: 'Let them know that whatever they are feeling is okay with you.', schedules: ['busy-student', 'business-professional'] },
      { text: 'Sometimes the most powerful thing you can say is simply: "I am with you."', schedules: ['flexible', 'business-professional'] },
    ],
  },

  'quality-time': {
    menstrual: [
      { text: 'Stay in together put on their favourite show and just be still with them.', schedules: ['flexible', 'busy-student'] },
      { text: 'Sit with them quietly without needing to fill the silence with conversation.', schedules: ['flexible', 'business-professional'] },
      { text: 'Suggest a slow, gentle walk outside if they have energy no agenda, just air.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Dedicate the evening to them without checking your phone or rushing anywhere.', schedules: ['flexible', 'business-professional'] },
      { text: 'Ask if they want company or space and genuinely honour whichever they choose.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Let the plan be whatever they need your flexibility is the quality time.', schedules: ['flexible'] },
    ],
    follicular: [
      { text: 'Plan something active or new together their energy is rising and ready for it.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Try a class, workshop, or experience they have been curious about.', schedules: ['flexible', 'busy-student'] },
      { text: 'Go for a morning walk or weekend adventure to match their refreshed energy.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Create space for a longer conversation over a meal they have a lot to share.', schedules: ['flexible', 'business-professional'] },
      { text: 'Let them lead and follow their energy wherever it goes be enthusiastic.', schedules: ['flexible', 'busy-student'] },
      { text: 'Suggest something you have never done together before this phase loves firsts.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    ],
    ovulation: [
      { text: 'Make a reservation somewhere special or plan a fun outing for just the two of you.', schedules: ['flexible', 'business-professional'] },
      { text: 'Say yes to a social thing they want to do their energy is at its peak.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'Do something you both enjoy, but with a little extra intentionality and effort.', schedules: ['flexible', 'business-professional'] },
      { text: 'Make your time together feel celebratory they will appreciate the gesture.', schedules: ['flexible', 'business-professional'] },
      { text: 'Be fully present no distractions. This is their peak connection time.', schedules: ['flexible', 'business-professional'] },
      { text: 'Plan something memorable this phase is made for shared highlights.', schedules: ['flexible', 'business-professional'] },
    ],
    luteal: [
      { text: 'Prioritise cozy, low-effort time together movie nights, slow evenings at home.', schedules: ['flexible', 'busy-student'] },
      { text: 'Be present without requiring anything from them quiet togetherness is enough.', schedules: ['flexible', 'business-professional'] },
      { text: 'Suggest a gentle evening routine that feels grounding and calm for both of you.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Watch something they choose, at their pace, without steering the plan.', schedules: ['flexible', 'busy-student'] },
      { text: 'Be the one to slow things down and create the calm they need.', schedules: ['flexible', 'business-professional'] },
      { text: 'Let "doing nothing together" be enough it genuinely is, right now.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    ],
    'extended-follicular': [
      { text: 'Channel time together into something productive or creative they are excited about.', schedules: ['flexible', 'busy-student'] },
      { text: 'Plan a day out that gives them room to explore what they are curious about.', schedules: ['flexible', 'business-professional'] },
      { text: 'Be present and participatory in whatever momentum they are riding.', schedules: ['flexible', 'busy-student'] },
      { text: 'Go somewhere new together their openness in this phase makes exploration rewarding.', schedules: ['flexible', 'business-professional'] },
      { text: 'Set aside intentional one-on-one time with full attention and presence.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'Match their pace and energy let their enthusiasm steer your shared time.', schedules: ['flexible', 'busy-student'] },
    ],
    pending: [
      { text: 'Keep plans simple and low-pressure comfortable togetherness over elaborate outings.', schedules: ['flexible', 'busy-student'] },
      { text: 'Be flexible and let them steer based on how they feel today.', schedules: ['flexible', 'business-professional'] },
      { text: 'Show up consistently your reliable presence is a gift in itself.', schedules: ['flexible', 'business-professional'] },
      { text: 'Enjoy a low-key activity side by side and let the comfort of familiarity be enough.', schedules: ['flexible', 'busy-student'] },
      { text: 'Make time for them without an agenda just being together is the point.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'A quiet evening in together can mean everything when done with intention.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    ],
  },

  'physical-touch': {
    menstrual: [
      { text: 'Offer a gentle back or shoulder rub to ease tension and cramps.', schedules: ['flexible', 'strict-gym-routine', 'busy-student'] },
      { text: 'Simply hold them close if they want warmth and closeness can be deeply soothing.', schedules: ['flexible', 'business-professional'] },
      { text: 'Place a hand on their shoulder or back as a quiet signal that you are there.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Run a warm bath and offer to stay nearby physical comfort goes beyond words.', schedules: ['flexible'] },
      { text: 'Let them rest against you without needing to talk or do anything.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'A long, slow hug can communicate more care than any words right now.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    ],
    follicular: [
      { text: 'A warm hug hello and goodbye sets the tone for a connected day.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'Hold hands on a walk small, casual touch reinforces closeness effortlessly.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'A brief shoulder massage after a productive day shows you see their effort.', schedules: ['flexible', 'busy-student'] },
      { text: 'Subtle affectionate touch throughout the day keeps the connection alive.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Physical affection matches their rising energy let it be playful and light.', schedules: ['flexible', 'busy-student'] },
      { text: 'Reach for them naturally simple gestures say a lot without a word.', schedules: ['flexible', 'business-professional'] },
    ],
    ovulation: [
      { text: 'Physical affection is especially welcome during this phase be warm and expressive.', schedules: ['flexible', 'business-professional'] },
      { text: 'Make physical touch generous and genuine today it will be deeply appreciated.', schedules: ['flexible', 'business-professional'] },
      { text: 'A spontaneous hug or kiss hello can mean more than you realise right now.', schedules: ['flexible', 'business-professional', 'busy-student'] },
      { text: 'Physical closeness naturally aligns with their peak energy lean into that.', schedules: ['flexible', 'business-professional'] },
      { text: 'Be affectionate in a way that says "I see you and I want to be close to you."', schedules: ['flexible', 'business-professional'] },
      { text: 'Do not hold back this is a high-connection phase and they will feel it.', schedules: ['flexible', 'business-professional'] },
    ],
    luteal: [
      { text: 'Focus on calming, non-demanding touch long hugs, a back rub, or just holding them.', schedules: ['flexible', 'busy-student'] },
      { text: 'A slow, gentle massage can ease both physical and emotional tension during this phase.', schedules: ['flexible', 'strict-gym-routine'] },
      { text: 'Offer touch without expectation closeness for its own sake is what they need.', schedules: ['flexible', 'business-professional'] },
      { text: 'Hold them close while watching TV quiet physical connection is deeply grounding.', schedules: ['flexible', 'busy-student'] },
      { text: 'Ask if they want a head or foot rub small gestures of care go a long way right now.', schedules: ['flexible', 'busy-student'] },
      { text: 'Let physical presence be your message warmth without words is enough.', schedules: ['flexible', 'business-professional'] },
    ],
    'extended-follicular': [
      { text: 'Reach for their hand naturally during the day small moments of connection add up.', schedules: ['flexible', 'business-professional'] },
      { text: 'Physical affection is welcome and appreciated let it feel natural and easy.', schedules: ['flexible', 'busy-student'] },
      { text: 'A spontaneous hug reinforces that you are paying attention to them.', schedules: ['flexible', 'business-professional'] },
      { text: 'Light touch throughout the day communicates care without needing words.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Physical warmth and presence match their stable, open energy right now.', schedules: ['flexible', 'business-professional'] },
      { text: 'Stay close your physical presence is a form of encouragement.', schedules: ['flexible', 'busy-student'] },
    ],
    pending: [
      { text: 'A warm hug at the start or end of the day is always welcome.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Small, caring touch keeps the connection alive even on quiet days.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Physical presence sitting close, a hand on the shoulder communicates care.', schedules: ['flexible', 'busy-student', 'business-professional'] },
      { text: 'Let touch be your quiet way of saying "I am with you."', schedules: ['flexible', 'business-professional'] },
      { text: 'Reach for their hand or offer a hug without needing a reason.', schedules: ['flexible', 'business-professional'] },
      { text: 'Your physical presence during uncertain times is more comforting than you know.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    ],
  },
};

// ─── Self-tracking suggestions (manual mode) ─────────────────────────────────

const selfSuggestions: Record<Phase, Suggestion[]> = {
  menstrual: [
    { text: 'Give yourself full permission to rest your body is doing meaningful work today.', schedules: ['flexible', 'busy-student', 'business-professional'] },
    { text: 'Prioritise warmth: a hot water bottle, warm bath, or heated blanket can ease cramps naturally.', schedules: ['flexible'] },
    { text: 'Opt for gentle movement like a slow walk or restorative yoga instead of intense workouts.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Iron-rich foods like lentils, spinach, and dark chocolate support your body right now.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Cancel what you can and protect your energy this is a time for inward focus.', schedules: ['flexible', 'business-professional'] },
    { text: 'Journal or reflect quietly menstrual energy often brings honest clarity.', schedules: ['flexible', 'busy-student'] },
  ],
  follicular: [
    { text: 'This is your fresh start set intentions for the week while your energy and optimism rise.', schedules: ['flexible', 'busy-student'] },
    { text: 'Try something new: a class, a creative project, or a conversation you have been putting off.', schedules: ['flexible', 'busy-student'] },
    { text: 'Your brain is primed for learning now read, plan, or explore something that excites you.', schedules: ['busy-student', 'business-professional'] },
    { text: 'Eat light, energising foods: salads, fruits, and lean proteins to match your rising vitality.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Get outside and move your body is ready for more activity and your mood will benefit.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Reach out to someone you have been meaning to connect with your social energy is building.', schedules: ['flexible', 'busy-student', 'business-professional'] },
  ],
  ovulation: [
    { text: 'You are at your social and energetic peak say yes to the things that excite you.', schedules: ['flexible', 'business-professional'] },
    { text: 'Schedule your most demanding tasks or important conversations now you are sharp and persuasive.', schedules: ['business-professional', 'busy-student'] },
    { text: 'Your confidence is naturally higher use it to tackle something you have been avoiding.', schedules: ['flexible', 'business-professional'] },
    { text: 'High-protein meals and hydration support your peak physical performance today.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Collaborate, create, or connect deeply this is your season for it.', schedules: ['flexible', 'business-professional'] },
    { text: 'Celebrate how you feel right now peak energy is a gift worth appreciating.', schedules: ['flexible', 'business-professional'] },
  ],
  luteal: [
    { text: 'Start simplifying your schedule your need for calm and routine is increasing.', schedules: ['flexible', 'business-professional'] },
    { text: 'Honour cravings mindfully: complex carbs, magnesium-rich foods, and dark chocolate help balance mood.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Move in gentler ways strength training and walking suit this phase better than high intensity.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Build in quiet time every day your inner world is asking for space and reflection.', schedules: ['flexible', 'busy-student'] },
    { text: 'This is a great phase for wrapping up projects and tying loose ends before your next cycle.', schedules: ['business-professional', 'busy-student'] },
    { text: 'Notice what feels draining and give yourself permission to let it go, at least for now.', schedules: ['flexible', 'business-professional'] },
  ],
  'extended-follicular': [
    { text: 'Your extended energy is a bonus use it to make progress on a goal that matters to you.', schedules: ['flexible', 'busy-student'] },
    { text: 'Stay consistent with what is working momentum is genuinely on your side right now.', schedules: ['flexible', 'business-professional'] },
    { text: 'Eat well and sleep enough sustaining this energy requires real care behind the scenes.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Keep pushing on creative or intellectual projects while your focus and drive are strong.', schedules: ['busy-student', 'business-professional'] },
    { text: 'Use this extra time to prepare for the slower phase ahead future you will be grateful.', schedules: ['flexible', 'business-professional'] },
    { text: 'Check in with how you actually feel beneath the energy sustainability matters.', schedules: ['flexible', 'busy-student'] },
  ],
  pending: [
    { text: 'Be gentle with yourself as you begin a new cycle there is no rush.', schedules: ['flexible', 'busy-student'] },
    { text: 'Eat nourishing, warming foods and stay hydrated as your body settles.', schedules: ['flexible', 'strict-gym-routine'] },
    { text: 'Rest if your body is asking for it honouring that is always the right call.', schedules: ['flexible', 'busy-student'] },
    { text: 'Take a few minutes to reflect on the last cycle and what you want from this one.', schedules: ['flexible', 'busy-student'] },
    { text: 'Start simple: one small intention for the week is more than enough.', schedules: ['flexible', 'busy-student'] },
    { text: 'Trust your body it knows what it needs even when things feel uncertain.', schedules: ['flexible', 'business-professional'] },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRandomSubset(pool: Suggestion[], count: number, schedule: string): string[] {
  // If schedule is 'flexible', we show everything. 
  // Otherwise, we filter for universal suggestions (!s.schedules) or specific matches.
  const filtered = schedule === 'flexible' 
    ? pool 
    : pool.filter(s => !s.schedules || s.schedules.includes(schedule as Schedule));
  
  // Shuffling logic
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, filtered.length)).map(s => s.text);
}

export function getPartnerSuggestions(
  phase: string,
  supportStyles: string[],
  schedule?: string,
  count = 2,
): string[] {
  const validPhase = phase as Phase;
  
  // Pool suggestions from ALL selected styles
  let fullPool: Suggestion[] = [];
  
  supportStyles.forEach(style => {
    const validStyle = style as SupportStyle;
    const styleObj = partnerSuggestions[validStyle];
    
    // Safety check: if style metadata exists for this phase, use it, else fallback
    const stylePool = (styleObj && styleObj[validPhase]) 
      ? styleObj[validPhase] 
      : (partnerSuggestions['emotional-support'][validPhase] || partnerSuggestions['emotional-support']['pending']);
    
    if (Array.isArray(stylePool)) {
      fullPool = [...fullPool, ...stylePool];
    }
  });

  // Ensure at least some suggestions exist
  if (fullPool.length === 0) {
    fullPool = partnerSuggestions['emotional-support']['pending'];
  }

  return getRandomSubset(fullPool, count, schedule || 'flexible');
}

export function getSelfSuggestions(phase: string, schedule?: string, count = 2): string[] {
  const pool = selfSuggestions[phase as Phase] ?? selfSuggestions['pending'];
  return getRandomSubset(pool, count, schedule || 'flexible');
}
