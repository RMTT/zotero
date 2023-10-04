/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2020 Corporation for Digital Scholarship
					 Vienna, Virginia, USA
					 https://www.zotero.org
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

"use strict";

{
	class PaneHeader extends XULElementBase {
		content = MozXULElement.parseXULToFragment(`
			<html:div class="head">
				<html:div class="title">
					<editable-text />
				</html:div>
				
				<html:div class="menu-button">
					<toolbarbutton
						class="expand-button"
						tooltiptext="&zotero.toolbar.openURL.label;"
						type="menu"
						wantdropmarker="true"
						tabindex="0">
						<menupopup onpopupshowing="Zotero_LocateMenu.buildLocateMenu(this)"/>	
					</toolbarbutton>
				</html:div>
			</html:div>
		`, ['chrome://zotero/locale/zotero.dtd']);
		
		_item = null;
		
		_titleFieldID = null;
		
		_mode = null;

		get item() {
			return this._item;
		}

		set item(item) {
			this.blurOpenField();
			this._item = item;
			this.render();
		}
		
		get mode() {
			return this._mode;
		}
		
		set mode(mode) {
			this._mode = mode;
			this.render();
		}

		init() {
			this._notifierID = Zotero.Notifier.registerObserver(this, ['item'], 'paneHeader');
			
			this.titleField = this.querySelector('.title editable-text');
			this.menuButton = this.querySelector('.menu-button');
			
			this.titleField.addEventListener('change', () => this.save());
			this.titleField.ariaLabel = Zotero.getString('itemFields.title');
			
			this.render();
		}
		
		destroy() {
			Zotero.Notifier.unregisterObserver(this._notifierID);
		}

		notify(action, type, ids) {
			if (action == 'modify' && this.item && ids.includes(this.item.id)) {
				this.render();
			}
		}
		
		async save() {
			if (this.item) {
				this.item.setField(this._titleFieldID, this.titleField.value);
				await this.item.saveTx();
			}
			this.render();
		}
		
		async blurOpenField() {
			this.titleField.blur();
			await this.save();
		}
		
		render() {
			if (!this.item) {
				return;
			}

			this._titleFieldID = Zotero.ItemFields.getFieldIDFromTypeAndBase(this.item.itemTypeID, 'title');
			
			let title = this.item.getField(this._titleFieldID);
			if (this.titleField.initialValue !== title) {
				this.titleField.value = title;
			}
			this.titleField.readOnly = this._mode == 'view';
			this.titleField.placeholder = Zotero.ItemFields.getLocalizedString(this._titleFieldID);
			this.menuButton.hidden = !this.item.isRegularItem() && !this.item.isAttachment();
		}
	}
	customElements.define("pane-header", PaneHeader);
}
