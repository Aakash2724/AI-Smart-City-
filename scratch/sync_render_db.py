import requests
import json
import time

API_URL = "https://ai-smart-city-rncj.onrender.com/api/v1"

SEED_DATA = [
    # Roads & Infrastructure
    {"text": "Massive road pothole near St. Jude School Jubilee Hills on Main Road causing major vehicular hazard.", "lat": 17.4435, "lng": 78.3820, "location": "School Road, Jubilee Hills, Ward 12", "email": "suresh.reddy@smartcity.in", "name": "Suresh Reddy"},
    {"text": "Deep potholes on Banjara Hills Road No 10 after heavy monsoon rain. Several bikers skidded.", "lat": 17.4180, "lng": 78.4420, "location": "Road No 10, Banjara Hills, Ward 10", "email": "rajesh.verma@yahoo.co.in", "name": "Rajesh Verma"},
    {"text": "Broken footpath slabs with open drainage pit near Secunderabad Clock Tower.", "lat": 17.4410, "lng": 78.5010, "location": "Station Road, Secunderabad, Ward 3", "email": "harish.patel@gmail.com", "name": "Harish Chandra Patel"},
    {"text": "Tar broken completely and large crater on Begumpet Flyover down-ramp.", "lat": 17.4440, "lng": 78.4680, "location": "Begumpet Airport Road, Ward 6", "email": "anand.vardhan@outlook.com", "name": "Anand Vardhan"},
    {"text": "Sadak par divider toot gaya hai aur concrete pieces road par bikhre hain.", "lat": 17.3950, "lng": 78.4310, "location": "Mehdipatnam Ring Road, Ward 7", "email": "manish.tiwari@gmail.com", "name": "Manish Tiwari"},
    {"text": "మణికొండ మెయిన్ రోడ్డులో గుంతలు పడి ద్విచక్ర వాహనాలు జారిపడుతున్నాయి.", "lat": 17.3980, "lng": 78.3750, "location": "Manikonda Pipeline Road, Ward 20", "email": "kiranmai.reddy@gmail.com", "name": "Kiranmai Reddy"},
    {"text": "Speed breaker marks erased completely near school zone in Alwal.", "lat": 17.5020, "lng": 78.5100, "location": "IG Statue Road, Alwal, Ward 1", "email": "tarun.tej@gmail.com", "name": "Tarun Tej"},
    {"text": "Road cave-in near stormwater drain outlet at Tarnaka crossroads.", "lat": 17.4280, "lng": 78.5380, "location": "Tarnaka Junction, Ward 2", "email": "vikas.mehra@gmail.com", "name": "Vikas Mehra"},

    # Sanitation & Waste
    {"text": "Sadak par kachra bahut dino se jama hai, bohot badboo aa rahi hai Central Market me.", "lat": 17.4370, "lng": 78.4480, "location": "Central Market Square, Ward 8", "email": "anita.desai@gmail.com", "name": "Anita Desai"},
    {"text": "Community dustbin near Dilsukhnagar Metro Station has been overflowing for 4 days.", "lat": 17.3680, "lng": 78.5270, "location": "Main Road, Dilsukhnagar, Ward 5", "email": "pooja.deshmukh@gmail.com", "name": "Pooja Deshmukh"},
    {"text": "Kondapur Botanical Garden road par illegal debris dump ho raha hai raat me.", "lat": 17.4600, "lng": 78.3600, "location": "Botanical Garden Road, Kondapur, Ward 19", "email": "sunita.agrawal@gmail.com", "name": "Sunita Agrawal"},
    {"text": "Medical waste and plastic bottles dumped openly behind hospital boundary wall.", "lat": 17.4480, "lng": 78.3810, "location": "Hitec City Hospital Lane, Ward 15", "email": "deepa.banerjee@gmail.com", "name": "Deepa Banerjee"},
    {"text": "చెత్త కుప్పలు చాలా రోజులుగా ఎత్తకపోవడంతో దుర్వాసన వస్తోంది. దోమలు పెరుగుతున్నాయి.", "lat": 17.4900, "lng": 78.4000, "location": "KPHB Phase 1, Ward 18, Kukatpally", "email": "siddharth.m@gmail.com", "name": "Siddharth Malhotra"},
    {"text": "Commercial fish market waste dumped on road side attracting vultures and dogs.", "lat": 17.3820, "lng": 78.4850, "location": "Moazzam Jahi Market, Ward 8", "email": "bhavna.chawla@gmail.com", "name": "Bhavna Chawla"},
    {"text": "Dead animal lying near Charminar monument road for over 24 hours.", "lat": 17.3610, "lng": 78.4740, "location": "Patel Market Road, Charminar, Ward 4", "email": "mohammed.z@gmail.com", "name": "Mohammed Zeeshan"},
    {"text": "Green park corner turned into open garbage dumping ground by street vendors.", "lat": 17.4140, "lng": 78.4380, "location": "Green Park Colony Gate 2, Ward 14", "email": "swati.s@gmail.com", "name": "Swati Sengupta"},

    # Water Supply & Sewage
    {"text": "Main water pipeline burst near Green Park Colony park gate flooding road.", "lat": 17.4120, "lng": 78.4350, "location": "Green Park Colony, Ward 14", "email": "vikram.k@outlook.com", "name": "Vikram Kulkarni"},
    {"text": "మా వీధిలో డ్రైనేజీ ఓవర్‌ఫ్లో అయి రోడ్డు మీద మురుగు నీరు పారుతోంది.", "lat": 17.4850, "lng": 78.3900, "location": "KPHB Colony 4th Phase, Ward 18, Kukatpally", "email": "kavita.srinivasan@outlook.com", "name": "Kavita Srinivasan"},
    {"text": "Drinking water coming mixed with brown dirty sewage in residential taps for 2 days.", "lat": 17.4350, "lng": 78.4410, "location": "Banjara Hills Road No 12, Ward 10", "email": "meenakshi.s@gmail.com", "name": "Meenakshi Sundaram"},
    {"text": "Drainage manhole lid broken and open on busy footpath near bus stop.", "lat": 17.4420, "lng": 78.3840, "location": "Madhapur Main Road, Ward 15", "email": "sneha.k@gmail.com", "name": "Sneha Kulkarni"},
    {"text": "No municipal drinking water supply received in Ward 12 for the past 48 hours.", "lat": 17.4320, "lng": 78.4050, "location": "Jubilee Hills Road No 36, Ward 12", "email": "divya.n@gmail.com", "name": "Divya Narayanan"},
    {"text": "Pani ki pipeline leak ho kar sadak par 2 feet paani bhar gaya hai.", "lat": 17.4520, "lng": 78.3580, "location": "Gachibowli Stadium Road, Ward 16", "email": "pradeep.j@gmail.com", "name": "Pradeep Joshi"},
    {"text": "Stormwater drain blocked by plastic bags causing rainwater backflow into houses.", "lat": 17.4700, "lng": 78.3200, "location": "Miyapur Metro Station Back Road, Ward 17", "email": "ananya.b@gmail.com", "name": "Ananya Bhattacharya"},
    {"text": "Gutter ka ganda paani road par beh raha hai, dukaano ke andar ja raha hai.", "lat": 17.3710, "lng": 78.4900, "location": "Malakpet Market Lane, Ward 5", "email": "farida.begum@gmail.com", "name": "Farida Begum"},

    # Electrical & Power
    {"text": "Streetlights not working on Cyber Boulevard road for 3 days. Complete darkness.", "lat": 17.4500, "lng": 78.3700, "location": "Cyber Boulevard, Ward 15, Madhapur", "email": "priya.patel@citymail.com", "name": "Priya Patel"},
    {"text": "Exposed live electric wire hanging from transformer pole near Ameerpet market.", "lat": 17.4375, "lng": 78.4485, "location": "Market Road, Ameerpet, Ward 9", "email": "lakshmi.priya@gmail.com", "name": "Lakshmi Priya G"},
    {"text": "Streetlight pole tilted dangerously at 45 degrees after vehicle collision.", "lat": 17.4290, "lng": 78.4110, "location": "Road No 45, Jubilee Hills, Ward 12", "email": "gautam.s@gmail.com", "name": "Gautam Singhania"},
    {"text": "Electric transformer sparking violently with loud noise in residential area.", "lat": 17.4410, "lng": 78.4980, "location": "MG Road, Secunderabad, Ward 3", "email": "pallavi.s@gmail.com", "name": "Pallavi Sharma"},
    {"text": "మా వీధిలో లైట్లు వెలగక 4 రోజులు అయింది. చీకట్లో మహిళలు వెళ్లడానికి భయపడుతున్నారు.", "lat": 17.4820, "lng": 78.4110, "location": "Kukatpally Housing Board Phase 2, Ward 18", "email": "raghavendra.r@gmail.com", "name": "Raghavendra Rao"},
    {"text": "Flickering high-mast light at major traffic circle causing disorienting glare.", "lat": 17.4390, "lng": 78.3490, "location": "Gachibowli Stadium Circle, Ward 16", "email": "sanjana.r@gmail.com", "name": "Sanjana Reddy"},
    {"text": "Underground cable damaged during road excavation, power cut in colony.", "lat": 17.4470, "lng": 78.3710, "location": "Mindspace IT Park Road, Ward 15", "email": "ashish.s@gmail.com", "name": "Ashish Saxena"},
    {"text": "Streetlight feeder pillar box open with child-accessible 415V copper busbars.", "lat": 17.4160, "lng": 78.4390, "location": "Banjara Hills Road No 1, Ward 10", "email": "vinay.mohan@gmail.com", "name": "Vinay Mohan"},

    # Traffic Enforcement
    {"text": "Commercial trucks parked illegally in no-parking zone completely blocking traffic flow.", "lat": 17.3600, "lng": 78.4700, "location": "Old City Gateway, Ward 4, Charminar Zone", "email": "farhan.quadri@citymail.in", "name": "Syed Farhan Quadri"},
    {"text": "రోడ్డుపై ట్రాఫిక్ సిగ్నల్ పనిచేయడం లేదు. తీవ్రమైన ట్రాఫిక్ జామ్ ఏర్పడింది.", "lat": 17.4400, "lng": 78.3480, "location": "Gachibowli Flyover Junction, Ward 16", "email": "venkat.ramana@gmail.com", "name": "Venkat Ramana Rao"},
    {"text": "Auto rickshaws parked haphazardly outside metro station blocking entire bus bay.", "lat": 17.4380, "lng": 78.4490, "location": "Ameerpet Metro Interchange, Ward 9", "email": "karthik.s@gmail.com", "name": "Karthik Subramanian"},
    {"text": "Construction materials and sand gravel dumped on main road taking up entire left lane.", "lat": 17.4310, "lng": 78.4060, "location": "Road No 36, Jubilee Hills, Ward 12", "email": "shreya.g@gmail.com", "name": "Shreya Ghoshal"},
    {"text": "Traffic light stuck on RED in all 4 directions causing massive gridlock during peak rush hour.", "lat": 17.4470, "lng": 78.3750, "location": "Inorbit Mall Intersection, Ward 15", "email": "chetan.b@gmail.com", "name": "Chetan Bhagat"}
]

def sync_all():
    print(f"Starting seed submission of {len(SEED_DATA)} complaints to Render live database...", flush=True)
    success_count = 0
    for idx, item in enumerate(SEED_DATA, 1):
        try:
            form_data = {
                "original_text": item["text"],
                "latitude": str(item["lat"]),
                "longitude": str(item["lng"]),
                "address": item["location"],
                "registered_email": item["email"],
                "citizen_name": item["name"]
            }
            res = requests.post(f"{API_URL}/complaints", data=form_data, timeout=30)
            if res.status_code == 200 or res.status_code == 201:
                data = res.json()
                print(f"[{idx}/{len(SEED_DATA)}] Added ticket {data.get('ticket_number')} -> {item['name']} ({item['location']})", flush=True)
                success_count += 1
            else:
                print(f"[{idx}] Status {res.status_code}: {res.text[:120]}", flush=True)
        except Exception as e:
            print(f"[{idx}] Error submitting: {e}", flush=True)
        time.sleep(0.3)

    # Re-check total complaints
    res = requests.get(f"{API_URL}/complaints")
    total_live = len(res.json())
    print(f"\nSUCCESS: Live Render Complaints Count is now: {total_live}", flush=True)

if __name__ == "__main__":
    sync_all()
