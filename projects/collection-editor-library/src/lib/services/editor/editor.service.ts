import { Injectable, EventEmitter } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { TreeService, DataService, PublicDataService } from '../../services';
import { EditorConfig } from '../../interfaces';
import { labelConfig} from '../../editor.config';
import * as _ from 'lodash-es';
import { skipWhile } from 'rxjs/operators';

@Injectable()
export class EditorService {
  data: any;
  private _editorConfig: EditorConfig;
  public questionStream$ = new Subject<any>();
  private _editorMode = 'edit';

  // tslint:disable-next-line:variable-name
  public _resourceAddition$ = new Subject<any>();
  public showLibraryPage: EventEmitter<number> = new EventEmitter();
  public readonly resourceAddition$: Observable<any> = this._resourceAddition$
    .asObservable().pipe(skipWhile(data => data === undefined || data === null));

  constructor(public treeService: TreeService,
              private dataService: DataService,
              private publicDataService: PublicDataService) { }

  public initialize(config: EditorConfig) {
    this._editorConfig = config;
    this._editorMode = _.get(this._editorConfig, 'config.mode');
  }

  public get editorConfig(): EditorConfig {
    return this._editorConfig;
  }

  get editorMode() {
    return this._editorMode;
  }

  getToolbarConfig() {
    return _.cloneDeep(_.merge(labelConfig, _.get(this.editorConfig, 'context.labels')));
  }

  emitResourceAddition(data) {
    this._resourceAddition$.next(data);
  }

  emitshowLibraryPageEvent(page) {
    this.showLibraryPage.emit(page);
  }
  getshowLibraryPageEmitter() {
    return this.showLibraryPage;
  }
  fetchCollectionHierarchy(collectionId): Observable<any> {
    const hierarchyUrl = 'content/v3/hierarchy/' + collectionId;
    const req = {
      url: hierarchyUrl,
      param: { mode: 'edit' }
    };
    return this.publicDataService.get(req);
  }

  fetchContentDetails(contentId) {
    const req = {
      url: 'content/v3/read/' + contentId
    };
    return this.publicDataService.get(req);
  }

  updateHierarchy(): Observable<any> {
    const req = {
      url: 'content/v3/hierarchy/update',
      data: {
        request: {
          data: {
            ...this.getCollectionHierarchy(),
            ...{lastUpdatedBy: 'b8d50233-5a4d-4a8c-9686-9c8bccd2c448'}
          }
        }
      }
    };
    return this.publicDataService.patch(req);
  }

  addResourceToHierarchy(collection, unitIdentifier, contentId): Observable<any> {
    const req = {
      url: 'content/v3/hierarchy/add',
      data: {
        request: {
          rootId: collection,
          unitId: unitIdentifier,
          children: [contentId]
        }
      }
    };
    return this.publicDataService.patch(req);
  }

  public getQuestionStream$() {
    return this.questionStream$;
  }

  public publish(value: any) {
    this.questionStream$.next(value);
  }

  getCollectionHierarchy() {
    const instance = this;
    this.data = {};
    const data = this.treeService.getFirstChild();
    return {
      nodesModified: this.treeService.treeCache.nodesModified,
      hierarchy: instance._toFlatObj(data)
    };
  }

  _toFlatObj(data) {
    const instance = this;
    if (data && data.data) {
      instance.data[data.data.id] = {
        name: data.title,
        contentType: data.data.objectType,
        children: _.map(data.children, (child) => {
          return child.data.id;
        }),
        root: data.data.root
      };

      _.forEach(data.children, (collection) => {
        instance._toFlatObj(collection);
      });
    }

    return instance.data;
  }

  getCategoryDefinition(categoryName, channel, objectType?: any) {
    const req = {
      url: 'object/category/definition/v1/read?fields=objectMetadata,forms,name',
      data: {
        request: {
          objectCategoryDefinition: {
              objectType: objectType ? objectType : 'Content',
              name: categoryName,
              ...(channel && { channel })
          },
        }
      }
    };
    return this.dataService.post(req);
  }
  fetchContentListDetails(req) {
    return this.publicDataService.post(req);
  }
}
