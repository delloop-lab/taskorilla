import { Model, StylesManager } from 'survey-core'

/**
 * SurveyJS Trial Form Schema
 * Simple form for testing/preview with helper/professional selection
 * Category and profession dropdowns match Full form (same contents and order)
 */
export function getTrialFormSchema(
  categories: Array<{ id: string; name: string; slug?: string }> = [],
  _professions: string[] = [], // Unused - we use PROFESSION_GROUPS to match Full form
  theme: 'default' | 'defaultV2' | 'modern' | 'custom' = 'modern',
  translate?: (key: string) => string
) {
  const t = translate || ((key: string) => key) // Fallback to key if no translate function

  // Simple helper types for the quick form – mirrors the full New Task form.
  const HELPER_TYPE_OPTIONS: string[] = [
    'Electrical & Plumbing',
    'Carpentry & Woodwork',
    'Painting, Tiling & Flooring',
    'Building & Renovations',
    'HVAC & Heating/Cooling',
    'Security & Locksmiths',
    'Appliance & Equipment Repairs',
    'Gardening & Outdoor Maintenance',
    'Cleaning & Home Care',
    'Moving & Lifting Help',
    'Furniture Assembly & DIY',
    'Decluttering & Organising',
    'Errands & Deliveries',
    'Pet & House Sitting',
    'Event Setup & Assistance',
    'Tech Help & Setup',
    'Other',
  ]

  const categoryChoices = HELPER_TYPE_OPTIONS.map((type) => ({
    value: type,
    text: type,
  }))

  // Helper categories (Hire a Helper) use the full category tree above.
  //
  // For "Engage a Professional" we want a very simple list of high-level
  // professional types that matches the full New Task form.
  const professionChoices = [
    { value: 'Health professionals', text: 'Health professionals' },
    { value: 'Financial professionals', text: 'Financial professionals' },
    { value: 'Legal professionals', text: 'Legal professionals' },
    { value: 'Property professionals', text: 'Property professionals' },
    { value: 'Business professionals', text: 'Business professionals' },
    { value: 'Education and coaching', text: 'Education and coaching' },
    { value: 'Other', text: 'Other' },
  ]

  return {
    title: t('surveyForm.title'),
    description: t('surveyForm.description'),
    pages: [
      {
        name: 'typePage',
        elements: [
          {
            type: 'radiogroup',
            name: 'taskType',
            title: t('surveyForm.taskTypeQuestion'),
            isRequired: true,
            choices: [
              { value: 'helper', text: t('surveyForm.hireHelper') },
              { value: 'professional', text: t('surveyForm.engageProfessional') }
            ],
            colCount: 0
          }
        ]
      },
      {
        name: 'categoryPage',
        elements: [
          {
            type: 'dropdown',
            name: 'category',
            title: t('surveyForm.categoryQuestion'),
            choices: categoryChoices.length > 0 
              ? categoryChoices 
              : [{ value: '', text: t('surveyForm.noCategoriesAvailable') }],
            choicesOrder: 'none',
            placeHolder: t('surveyForm.selectCategoryPlaceholder'),
            showNoneItem: false,
            visibleIf: '{taskType} = "helper"'
          }
        ]
      },
      {
        name: 'professionPage',
        elements: [
          {
            type: 'dropdown',
            name: 'requiredProfession',
            title: t('surveyForm.professionQuestion'),
            choices: professionChoices.length > 0 
              ? professionChoices 
              : [{ value: '', text: t('surveyForm.noProfessionsAvailable') }],
            choicesOrder: 'none',
            placeHolder: t('surveyForm.selectProfessionPlaceholder'),
            showNoneItem: false,
            visibleIf: '{taskType} = "professional"'
          }
        ]
      },
      {
        name: 'titlePage',
        elements: [
          {
            type: 'comment',
            name: 'title',
            title: t('surveyForm.taskTitleQuestion'),
            isRequired: true,
            maxLength: 200,
            placeHolder: t('surveyForm.taskTitlePlaceholder'),
            rows: 2,
            autoGrow: true
          }
        ]
      },
      {
        name: 'descriptionPage',
        elements: [
          {
            type: 'comment',
            name: 'description',
            title: t('surveyForm.descriptionQuestion'),
            isRequired: true,
            maxLength: 5000,
            placeHolder: t('surveyForm.descriptionPlaceholder'),
            rows: 6
          }
        ]
      },
      {
        name: 'budgetPage',
        elements: [
          {
            type: 'text',
            name: 'budget',
            title: t('surveyForm.budgetQuestion'),
            // NOTE: Changed from inputType: 'number' to regular text input
            // because SurveyJS number inputs were causing refresh issues when logged in
            placeHolder: t('surveyForm.budgetPlaceholder'),
            description: ''
          },
          {
            type: 'html',
            name: 'budgetHelpHtml',
            html: `
              <div style="margin-top: 12px; padding: 14px 16px; border: 1px solid #bfdbfe; border-radius: 12px; background: #f8fbff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); line-height: 1.5;">
                <p style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 12px; font-weight: 700;">
                  💡 Smart Suggestion
                </p>
                <p style="margin: 0; color: #1f2937; font-size: 13px;">
                  <strong>Get 3x More Bids by Setting a Budget</strong><br />
                  Tasks with a defined budget are prioritized by our top-rated Helpers. Not sure where to start?
                  Use our 2026 Service Price Index to find the right benchmark for your task and location.
                </p>
                <a
                  href="/help/guides/taskorilla-service-price-index-portugal-2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="display: inline-block; margin-top: 10px; background: #0088CC; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 12px; padding: 8px 12px; border-radius: 8px;"
                >
                  View Price Index
                </a>
              </div>
            `
          }
        ]
      },
      {
        name: 'locationPage',
        elements: [
          {
            type: 'text',
            name: 'postcode',
            title: t('surveyForm.locationQuestion'),
            isRequired: true,
            placeHolder: t('surveyForm.postcodePlaceholder'),
            description: t('surveyForm.locationDescription'),
            enableIf: 'true',
            maxLength: 8 // Portuguese format: xxxx-xxx (8 chars including dash)
          },
          {
            type: 'text',
            name: 'location',
            title: t('surveyForm.locationAddressTitle'),
            readOnly: true,
            placeHolder: t('surveyForm.locationAddressPlaceholder'),
            startWithNewLine: true
          },
          {
            type: 'text',
            name: 'latitude',
            visible: false
          },
          {
            type: 'text',
            name: 'longitude',
            visible: false
          }
        ]
      },
      {
        name: 'dueDatePage',
        elements: [
          {
            type: 'text',
            name: 'dueDate',
            title: t('surveyForm.dueDateQuestion'),
            inputType: 'date',
            isRequired: true,
            placeHolder: t('surveyForm.dueDatePlaceholder'),
            defaultValue: new Date().toISOString().split('T')[0] // Default to today's date (YYYY-MM-DD format)
          }
        ]
      },
      {
        name: 'imagePage',
        elements: [
          {
            type: 'html',
            name: 'imageUploadHtml',
            html: `
              <div class="image-upload-container" style="text-align: center; padding: 20px; max-width: 500px; margin: 0 auto;">
                <h2 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700; color: #1A2B3C; line-height: 1.2;">Show your task to get faster, more accurate quotes</h2>
                <p style="margin: 0 0 16px 0; color: #4A5568; font-size: 14px; text-align: center;">A few clear photos help Helpers understand scope and send stronger quotes.</p>
                <label for="survey-image-input" id="survey-upload-area" style="display: block; border: 2px dashed #d1d5db; border-radius: 10px; padding: 44px; cursor: pointer; transition: all 0.2s; background: #f9fafb;">
                  <input type="file" id="survey-image-input" accept="image/*,.jfif" style="display: none;" onchange="(function(input){
                    if(!input.files||!input.files[0])return;
                    var file=input.files[0];
                    var preview=document.getElementById('survey-inline-preview');
                    var previewImg=document.getElementById('survey-preview-image');
                    var status=document.getElementById('survey-upload-status');
                    if(preview)preview.style.display='block';
                    if(status){status.textContent='Loading preview...';status.style.color='#6b7280';}
                    var reader=new FileReader();
                    reader.onload=function(e){
                      if(previewImg)previewImg.src=e.target.result;
                      if(status){status.textContent='Uploading to server...';status.style.color='#3b82f6';}
                    };
                    reader.readAsDataURL(file);
                    if(window.handleSurveyImageUpload)window.handleSurveyImageUpload(input);
                  })(this)" />
                  <div id="survey-upload-placeholder">
                    <svg style="width: 56px; height: 56px; margin: 0 auto 14px; color: #F59E0B;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p style="color: #1A2B3C; font-weight: 600; margin-bottom: 6px;">Click or drag photos here to upload</p>
                    <p style="color: #64748b; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">PNG, JPG, JFIF, GIF up to 5MB</p>
                  </div>
                </label>
                <div id="survey-inline-preview" style="display: none; margin-top: 16px; padding: 12px; border: 1px solid #dbeafe; border-radius: 10px; background: #f8fbff;">
                    <img id="survey-preview-image" alt="Uploaded preview" style="max-width: 100%; max-height: 300px; border-radius: 6px; margin-bottom: 12px;" />
                    <p id="survey-upload-status" style="color: #10b981; font-weight: 500; margin: 0;">✓ Image uploaded</p>
                  </div>
                <div style="margin: 24px auto 0 auto; max-width: 500px; text-align: left; padding: 14px 16px; border: 1px solid #bfdbfe; border-radius: 12px; background: #f8fbff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <p style="margin: 0 0 6px 0; color: #1e3a8a; font-size: 12px; font-weight: 700;">💡 Smart Suggestion</p>
                  <p style="margin: 0; color: #1f2937; font-size: 13px; line-height: 1.5;">
                    <strong>Photos get you booked faster!</strong><br />
                    Tasks with clear images receive <strong>40% more interest</strong> and significantly more accurate pricing. Show Helpers exactly what needs to be done to avoid follow-up questions and get the job done right.
                  </p>
                </div>
                <style>
                  @keyframes spin { to { transform: rotate(360deg); } }
                  #survey-upload-area:hover { border-color: #3b82f6; background: #F7FAFC; }
                </style>
              </div>
            `
          },
          {
            type: 'text',
            name: 'image',
            visible: false
          }
        ]
      }
    ],
    showProgressBar: 'top',
    showQuestionNumbers: 'off',
    completeText: t('surveyForm.previewButton'),
    pageNextText: t('surveyForm.nextButton'),
    pagePrevText: t('surveyForm.backButton'),
    firstPageIsStarted: false,
    goNextPageAutomatic: false,
    showCompletedPage: false,
    showPreviewBeforeComplete: 'showAllQuestions'
  }
}

/**
 * Create SurveyJS Model instance from schema
 */
export function createTrialFormModel(
  categories: Array<{ id: string; name: string }> = [],
  professions: string[] = [],
  theme: 'default' | 'defaultV2' | 'modern' | 'custom' = 'modern',
  translate?: (key: string) => string
) {
  const schema = getTrialFormSchema(categories, professions, theme, translate)
  const model = new Model(schema)
  
  // Apply theme using SurveyJS's built-in theme system
  // Note: CSS files must be imported upfront for this to work
  if (theme === 'modern') {
    StylesManager.applyTheme('modern')
  } else if (theme === 'defaultV2') {
    StylesManager.applyTheme('defaultV2')
  } else if (theme === 'default') {
    StylesManager.applyTheme('defaultV2') // default and defaultV2 are the same in v1.12.57
  }
  // For 'custom', don't apply any SurveyJS theme - use only our custom CSS
  
  return model
}

