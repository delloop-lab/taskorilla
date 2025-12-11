import { Model, StylesManager } from 'survey-core'

/**
 * SurveyJS Trial Form Schema
 * Simple form for testing/preview with helper/professional selection
 */
export function getTrialFormSchema(
  categories: Array<{ id: string; name: string }> = [],
  professions: string[] = [],
  theme: 'default' | 'defaultV2' | 'modern' | 'custom' = 'modern',
  translate?: (key: string) => string
) {
  const t = translate || ((key: string) => key) // Fallback to key if no translate function
  const categoryChoices = categories.map(cat => ({
    value: cat.id,
    text: cat.name
  }))

  const professionChoices = professions.map(prof => ({
    value: prof,
    text: prof
  }))

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
            description: t('surveyForm.budgetDescription')
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
              <div class="image-upload-container" style="text-align: center; padding: 20px;">
                <h3 style="margin-bottom: 16px; font-size: 18px; font-weight: 600; color: #374151;">Upload a photo to show the task better?</h3>
                <p style="margin-bottom: 16px; color: #6b7280; font-size: 14px;">Optional - helps helpers understand your task</p>
                <label for="survey-image-input" id="survey-upload-area" style="display: block; border: 2px dashed #d1d5db; border-radius: 8px; padding: 32px; cursor: pointer; transition: all 0.2s; background: #f9fafb;">
                  <input type="file" id="survey-image-input" accept="image/*" style="display: none;" onchange="(function(input){
                    if(!input.files||!input.files[0])return;
                    var file=input.files[0];
                    var placeholder=document.getElementById('survey-upload-placeholder');
                    var preview=document.getElementById('survey-upload-preview');
                    var previewImg=document.getElementById('survey-preview-image');
                    var status=document.getElementById('survey-upload-status');
                    if(placeholder)placeholder.style.display='none';
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
                    <svg style="width: 48px; height: 48px; margin: 0 auto 12px; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p style="color: #374151; font-weight: 500; margin-bottom: 4px;">Click to upload an image</p>
                    <p style="color: #9ca3af; font-size: 12px;">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <div id="survey-upload-preview" style="display: none;">
                    <img id="survey-preview-image" alt="Uploaded preview" style="max-width: 100%; max-height: 300px; border-radius: 6px; margin-bottom: 12px;" />
                    <p id="survey-upload-status" style="color: #10b981; font-weight: 500;">✓ Image uploaded</p>
                  </div>
                </label>
                <style>
                  @keyframes spin { to { transform: rotate(360deg); } }
                  #survey-upload-area:hover { border-color: #3b82f6; background: #eff6ff; }
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

