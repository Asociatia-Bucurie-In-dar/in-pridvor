
# WordPress Import Instructions

## Generated Data Files:
- `users.json` - 2 users to create
- `categories.json` - 35 categories to create  
- `posts-sample.json` - 10 sample posts for testing
- `posts-all.json` - All 328 posts

## Manual Import Steps:

### 1. Create Users
Go to Payload Admin → Users → Create New
Create these users:
- Name: adminpdv, Email: adminpdv@email.com
- Name: George Olteanu, Email: george.olteanu@email.com

### 2. Create Categories  
Go to Payload Admin → Categories → Create New
Create these categories:
- Title: Rânduri de gânduri, Slug: r-nduri-de-g-nduri
- Title: Așază-te o clipă!, Slug: a-az-te-o-clip
- Title: Printre umbre și lumini, Slug: printre-umbre-i-lumini
- Title: Oglindiri, Slug: oglindiri
- Title: Firimituri de bucurie, Slug: firimituri-de-bucurie
- Title: Pastila de sănătate, Slug: pastila-de-s-n-tate
- Title: Editorial, Slug: editorial
- Title: Doamne, strigat-am!, Slug: doamne-strigat-am
- Title: Semințe de Duh, Slug: semin-e-de-duh
- Title: Nescris de mult, Slug: nescris-de-mult
- Title: Arta Acasă, Slug: arta-acas
- Title: La picior prin Pridvor, Slug: la-picior-prin-pridvor
- Title: Cele mai noi, Slug: cele-mai-noi
- Title: Acasă la Sfinți, Slug: acas-la-sfin-i
- Title: Har peste har, Slug: har-peste-har
- Title: Pietre de hotar, Slug: pietre-de-hotar
- Title: Călăuza, Slug: c-l-uza
- Title: Cerșetorul de albastru, Slug: cer-etorul-de-albastru
- Title: Dragă mamă, Slug: drag-mam
- Title: Jurnalul târnosirii, Slug: jurnalul-t-rnosirii
- Title: Video, Slug: video
- Title: În tinda Raiului, Slug: n-tinda-raiului
- Title: Jurnalul tămăduirii, Slug: jurnalul-t-m-duirii
- Title: Din cămara inimii, Slug: din-c-mara-inimii
- Title: Inima inimii, Slug: inima-inimii
- Title: Seva vieții, Slug: seva-vie-ii
- Title: Cea mai mare Iubire, Slug: cea-mai-mare-iubire
- Title: Picături de moarte, Slug: pic-turi-de-moarte
- Title: Grădina cu înțelesuri, Slug: gr-dina-cu-n-elesuri
- Title: Jăraticale, Slug: j-raticale
- Title: Cerneală de bezne, Slug: cerneal-de-bezne
- Title: Frumos pe pâine, Slug: frumos-pe-p-ine
- Title: Pesemne, Slug: pesemne
- Title: Culoarea zilei, Slug: culoarea-zilei
- Title: „Hristos în mijlocul nostru!”, Slug: hristos-n-mijlocul-nostru

### 3. Import Posts
After creating users and categories, you can:
- Use the Payload admin interface to create posts manually
- Or use the generated JSON data with a script that has proper authentication
- Or import via the admin interface using the JSON structure

## Authors Found:
- adminpdv
- George Olteanu

## Categories Found:
- Rânduri de gânduri
- Așază-te o clipă!
- Printre umbre și lumini
- Oglindiri
- Firimituri de bucurie
- Pastila de sănătate
- Editorial
- Doamne, strigat-am!
- Semințe de Duh
- Nescris de mult
- Arta Acasă
- La picior prin Pridvor
- Cele mai noi
- Acasă la Sfinți
- Har peste har
- Pietre de hotar
- Călăuza
- Cerșetorul de albastru
- Dragă mamă
- Jurnalul târnosirii
- Video
- În tinda Raiului
- Jurnalul tămăduirii
- Din cămara inimii
- Inima inimii
- Seva vieții
- Cea mai mare Iubire
- Picături de moarte
- Grădina cu înțelesuri
- Jăraticale
- Cerneală de bezne
- Frumos pe pâine
- Pesemne
- Culoarea zilei
- „Hristos în mijlocul nostru!”

## Next Steps:
1. Create the users and categories manually in the admin interface
2. Note down their IDs
3. Update the posts data with the correct user and category IDs
4. Import the posts (manually or via script with authentication)
