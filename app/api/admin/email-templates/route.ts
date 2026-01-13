import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Check if user is admin
async function checkAdmin(request: NextRequest): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role === 'admin' || profile?.role === 'superadmin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// GET - Fetch all templates or specific template by type
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient(request)
    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('type')

    let query = supabase
      .from('email_templates')
      .select('*')
      .order('template_type', { ascending: true })

    if (templateType) {
      query = query.eq('template_type', templateType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching email templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error: any) {
    console.error('Error in GET email templates:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { template_type, subject, html_content } = body

    if (!template_type || !subject || !html_content) {
      return NextResponse.json(
        { error: 'Missing required fields: template_type, subject, html_content' },
        { status: 400 }
      )
    }

    // Validate template_type format (alphanumeric, underscore, hyphen, spaces allowed)
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(template_type)) {
      return NextResponse.json(
        { error: 'Invalid template_type. Only alphanumeric characters, underscores, hyphens, and spaces are allowed.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient(request)
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        template_type,
        subject,
        html_content,
      })
      .select()
      .single()

    if (error) {
      // If duplicate, update instead
      if (error.code === '23505') {
        const supabase = createServerSupabaseClient(request)
        const { data: updatedData, error: updateError } = await supabase
          .from('email_templates')
          .update({ subject, html_content })
          .eq('template_type', template_type)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating email template:', updateError)
          return NextResponse.json({ 
            error: 'Failed to update template',
            details: updateError.message 
          }, { status: 500 })
        }

        return NextResponse.json({ template: updatedData })
      }

      // Check if it's a constraint violation (CHECK constraint still exists)
      if (error.code === '23514' || error.message?.includes('check constraint')) {
        console.error('Database constraint error:', error)
        return NextResponse.json({ 
          error: 'Database constraint error. Please run the migration script to remove the CHECK constraint on email_templates table.',
          details: error.message 
        }, { status: 500 })
      }

      console.error('Error creating email template:', error)
      return NextResponse.json({ 
        error: 'Failed to create template',
        details: error.message || error.code || 'Unknown error'
      }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error: any) {
    console.error('Error in POST email templates:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update existing template
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, template_type, subject, html_content } = body

    if (!id && !template_type) {
      return NextResponse.json(
        { error: 'Missing required field: id or template_type' },
        { status: 400 }
      )
    }

    if (!subject && !html_content) {
      return NextResponse.json(
        { error: 'At least one field to update is required: subject or html_content' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (subject) updateData.subject = subject
    if (html_content) updateData.html_content = html_content

    const supabase = createServerSupabaseClient(request)
    let query = supabase
      .from('email_templates')
      .update(updateData)

    if (id) {
      query = query.eq('id', id)
    } else if (template_type) {
      query = query.eq('template_type', template_type)
    }

    const { data, error } = await query.select().single()

    if (error) {
      console.error('Error updating email template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error: any) {
    console.error('Error in PUT email templates:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const templateType = searchParams.get('type')

    if (!id && !templateType) {
      return NextResponse.json(
        { error: 'Missing required parameter: id or type' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient(request)
    let query = supabase.from('email_templates').delete()

    if (id) {
      query = query.eq('id', id)
    } else if (templateType) {
      query = query.eq('template_type', templateType)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting email template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE email templates:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
