import { getPayload, createLocalReq } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export const maxDuration = 300

function normalizeForMatching(text: string): string {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .trim()
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș/g, 's')
    .replace(/ț/g, 't')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractPlainTextFromLexical(lexicalContent: any): string {
  if (!lexicalContent || !lexicalContent.root || !lexicalContent.root.children) {
    return ''
  }

  let text = ''
  
  function traverse(node: any) {
    if (node.type === 'text' && node.text) {
      text += node.text + ' '
    }
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(traverse)
    }
  }
  
  lexicalContent.root.children.forEach(traverse)
  
  return text.trim()
}

function findAuthorInContent(content: string, authorName: string, normalizedAuthorName: string): boolean {
  const normalizedContent = normalizeForMatching(content)
  
  if (normalizedContent.includes(normalizedAuthorName)) {
    return true
  }
  
  const nameParts = normalizedAuthorName.split(' ').filter(part => part.length > 2)
  
  if (nameParts.length >= 2) {
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]
    
    if (firstName && lastName && normalizedContent.includes(firstName) && normalizedContent.includes(lastName)) {
      const firstNameIndex = normalizedContent.indexOf(firstName)
      const lastNameIndex = normalizedContent.indexOf(lastName)
      
      const distance = Math.abs(firstNameIndex - lastNameIndex)
      
      if (distance < 50) {
        return true
      }
    }
  }
  
  return false
}

function findAuthorByName(allUsers: any[], namePatterns: string[]): any {
  for (const user of allUsers) {
    if (!user.name) continue
    const normalizedName = normalizeForMatching(user.name)
    for (const pattern of namePatterns) {
      const normalizedPattern = normalizeForMatching(pattern)
      if (normalizedName === normalizedPattern || 
          normalizedName.includes(normalizedPattern) || 
          normalizedPattern.includes(normalizedName)) {
        return user
      }
      const nameParts = normalizedName.split(' ').filter(p => p.length > 1)
      const patternParts = normalizedPattern.split(' ').filter(p => p.length > 1)
      if (patternParts.length >= 2 && nameParts.length >= 2 && patternParts[0] && nameParts[0]) {
        const lastNameMatch = patternParts[patternParts.length - 1] === nameParts[nameParts.length - 1]
        const firstNameMatch = patternParts[0] === nameParts[0] || patternParts[0].includes(nameParts[0]) || nameParts[0].includes(patternParts[0])
        if (lastNameMatch && firstNameMatch) {
          return user
        }
      }
    }
  }
  return null
}

function getCategoryAuthor(categorySlug: string, allUsers: any[]): any | null {
  const normalizedSlug = normalizeForMatching(categorySlug)
  
  if (normalizedSlug === 'in-tinda-raiului') {
    return findAuthorByName(allUsers, ['Maica D.', 'Maica D'])
  }
  
  if (normalizedSlug === 'nescris-de-mult') {
    return findAuthorByName(allUsers, ['Cosmina Dragomir'])
  }
  
  if (normalizedSlug === 'culoarea-zilei') {
    return findAuthorByName(allUsers, ['Pr. Cristian Muntean', 'Cristian Muntean'])
  }
  
  if (normalizedSlug === 'picaturi-de-moarte') {
    return findAuthorByName(allUsers, ['Șerban Madgearu', 'Serban Madgearu'])
  }
  
  if (normalizedSlug === 'draga-mama') {
    return findAuthorByName(allUsers, ['Dr. Daniela Ilioiu', 'Daniela Ilioiu'])
  }
  
  if (normalizedSlug === 'printre-umbre-si-lumini') {
    return findAuthorByName(allUsers, ['Simona Andrușcă', 'Simona Andrusca'])
  }
  
  if (normalizedSlug.includes('nascuta-mama') || normalizedSlug.includes('arta-acasa')) {
    return findAuthorByName(allUsers, ['Pr. Cristian Muntean', 'Cristian Muntean'])
  }
  
  return null
}

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  const payloadReq = await createLocalReq({ user }, payload)

  try {
    payload.logger.info('🔍 Starting author assignment...')
    payload.logger.info('─'.repeat(50))

    const allUsers = await payload.find({
      collection: 'users',
      limit: 1000,
      depth: 0,
    })

    if (allUsers.docs.length === 0) {
      return Response.json(
        {
          success: false,
          message: 'No users found in database',
          updated: 0,
          total: 0,
        },
        { status: 400 },
      )
    }

    payload.logger.info(`📋 Found ${allUsers.docs.length} users in database`)

    const ancaUser = allUsers.docs.find((u) => {
      const normalizedName = normalizeForMatching(u.name || '')
      return normalizedName.includes('anca') && normalizedName.includes('stanciu')
    })

    if (!ancaUser) {
      return Response.json(
        {
          success: false,
          message: 'Anca Stanciu user not found',
          updated: 0,
          total: 0,
        },
        { status: 404 },
      )
    }

    payload.logger.info(`✅ Default author: ${ancaUser.name} (ID: ${ancaUser.id})`)

    const allPosts = await payload.find({
      collection: 'posts',
      limit: 10000,
      depth: 1,
      where: {
        _status: {
          equals: 'published',
        },
      },
    })

    payload.logger.info(`📄 Found ${allPosts.docs.length} published posts`)
    payload.logger.info('─'.repeat(50))

    let updated = 0
    let noMatch = 0
    let alreadyCorrect = 0
    const matchingDetails: string[] = []

    for (const post of allPosts.docs) {
      if (!post.content || !post.id) {
        payload.logger.warn(`⚠️  Post "${post.title}" has no content, skipping`)
        continue
      }

      let matchedUser = null
      let matchSource = ''

      if (post.categories && Array.isArray(post.categories) && post.categories.length > 0) {
        for (const category of post.categories) {
          let categoryData: any = null
          
          if (typeof category === 'object' && category !== null && 'slug' in category) {
            categoryData = category
          } else if (typeof category === 'number' || typeof category === 'string') {
            try {
              categoryData = await payload.findByID({
                collection: 'categories',
                id: category,
                depth: 1,
              })
            } catch {
              payload.logger.warn(`Failed to fetch category ${category} for post "${post.title}"`)
            }
          }
          
          if (categoryData?.slug) {
            let categoryPath = categoryData.slug
            
            if (categoryData.parent && typeof categoryData.parent === 'object' && categoryData.parent.slug) {
              categoryPath = `${categoryData.parent.slug}/${categoryData.slug}`
            }
            
            const categoryAuthor = getCategoryAuthor(categoryPath, allUsers.docs)
            if (categoryAuthor) {
              matchedUser = categoryAuthor
              matchSource = `category (${categoryPath})`
              break
            }
          }
        }
      }

      if (!matchedUser) {
        const plainText = extractPlainTextFromLexical(post.content)
        
        if (!plainText || plainText.trim().length === 0) {
          payload.logger.warn(`⚠️  Post "${post.title}" has empty content, skipping`)
          continue
        }

        let bestMatch: { user: any; score: number } | null = null

        for (const candidateUser of allUsers.docs) {
          if (!candidateUser.name) continue

          const normalizedName = normalizeForMatching(candidateUser.name)
          
          if (normalizedName.length < 3) continue

          const isMatch = findAuthorInContent(plainText, candidateUser.name, normalizedName)

          if (isMatch) {
            const matchScore = normalizedName.split(' ').length
            
            if (!bestMatch || matchScore > bestMatch.score) {
              bestMatch = {
                user: candidateUser,
                score: matchScore,
              }
            }
          }
        }

        if (bestMatch) {
          matchedUser = bestMatch.user
          matchSource = 'content'
        }
      }

      const targetAuthorId = matchedUser ? matchedUser.id : ancaUser.id
      const targetAuthorName = matchedUser ? matchedUser.name : ancaUser.name

      const currentAuthorIds = Array.isArray(post.authors)
        ? post.authors.map((a: any) => (typeof a === 'object' && a !== null ? a.id : a))
        : []

      const needsUpdate = currentAuthorIds.length !== 1 || currentAuthorIds[0] !== targetAuthorId

      if (needsUpdate) {
        try {
          await payload.update({
            collection: 'posts',
            id: post.id,
            data: {
              authors: [targetAuthorId],
            },
            context: {
              disableRevalidate: true,
            },
            req: payloadReq,
          })

          updated++
          const sourceNote = matchSource ? ` [${matchSource}]` : matchedUser ? '' : ' [default - no match found]'
          matchingDetails.push(
            `✅ "${post.title}": Assigned to ${targetAuthorName}${sourceNote}`,
          )

          if (updated % 10 === 0) {
            payload.logger.info(`   Updated ${updated} posts...`)
          }
        } catch (error: any) {
          payload.logger.error(
            `❌ Failed to update post "${post.title}": ${error.message}`,
          )
        }
      } else {
        alreadyCorrect++
      }

      if (!matchedUser) {
        noMatch++
      }
    }

    payload.logger.info('─'.repeat(50))
    payload.logger.info(`📊 Author Assignment Summary:`)
    payload.logger.info(`   Total posts processed: ${allPosts.docs.length}`)
    payload.logger.info(`   Posts updated: ${updated}`)
    payload.logger.info(`   Posts already correct: ${alreadyCorrect}`)
    payload.logger.info(`   Posts with no match (defaulted): ${noMatch}`)

    return Response.json({
      success: true,
      updated,
      total: allPosts.docs.length,
      alreadyCorrect,
      noMatch,
      matchingDetails: matchingDetails.slice(0, 50),
    })
  } catch (error: any) {
    payload.logger.error('❌ Author assignment failed:', error)
    return Response.json(
      {
        success: false,
        message: error.message || 'Author assignment failed',
        updated: 0,
        total: 0,
      },
      { status: 500 },
    )
  }
}

