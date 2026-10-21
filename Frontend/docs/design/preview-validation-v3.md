# History preview verification v3

Date: 20 October 2026. Design-only artifacts; Backend and frontend product code unchanged.

Selected outputs:

- previews/history-monthly-table-v3.png: overall monthly table only, generated with image_gen.
- previews/history-spc-detail-v3.png and .svg: new deterministic Matplotlib rendering from the fictional EE fixture, without reading/editing any input image.

The AI-generated intermediate SPC previews contained inconsistent numerical labels and were not selected. The final report obtains chart lines, statistic labels, subgroup means/ranges and measurement rows from the same synthetic fixture. Both selected PNGs were reopened successfully and inspected visually.

Independent arithmetic review confirmed N=28, grand mean 4.49857143, sample s=0.01297127, Rbar=0.02285714, UCLx=4.51523429, LCLx=4.48190857, UCLr=0.05216, LCLr=0, and paper-method Cp/Cpk=2.569781/2.533070. Separate sigma_within=0.0111011, equipment code/name, resolution and shift/time are included in the final report. These are fictional demonstration values, not operator measurements or process acceptance evidence.

The n=4 sample fixture and all raw-data table entries were checked against the displayed means and ranges. Cp/Cpk use the visibly identified proposed paper_stdev_s method, not an undisclosed within-subgroup estimate. The full design records uncertainty about the paper's unspecified stdev convention and requires reviewed method/version metadata.

All seven numeric paper chart profiles are mapped in history-spc-v3. Talc sample-count interpretation, Sweeping instrument description and Gasket schedule remain marked source-review items. No statistical result is supplied for a visual-only check. No new API/report/database field has been implemented or marked verified by these design checks.
